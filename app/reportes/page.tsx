"use client";

import { useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

type MembresiaData = {
  nombre?: string;
  telefono?: string;
  placas?: string;
  marca?: string;
  subMarca?: string;
  serie?: string;
  color?: string;
  numeroMembresia?: string;
  plan?: string;
  vigencia?: string;
  estado?: string;
  tipoCliente?: "particular" | "servicio_publico";
};

type ReporteData = {
  nombreCliente: string;
  telefono: string;
  placas: string;
  tipoServicio: string;
  ubicacion: string;
  linkUbicacion: string;
  descripcion: string;
  membresiaActiva: boolean;
  plan: string;
  vigencia: string;
  tipoCliente: string;
  costoServicio: number | null;
  marca: string;
  subMarca: string;
  serie: string;
  color: string;
};

const TARIFAS = {
  Ajustador: {
    particular: {
      conMembresia: 750,
      sinMembresia: 1800,
    },
    servicio_publico: {
      conMembresia: 500,
      sinMembresia: null,
    },
  },
  Abogado: {
    particular: {
      conMembresia: 1200,
      sinMembresia: 2400,
    },
    servicio_publico: {
      conMembresia: 850,
      sinMembresia: null,
    },
  },
  "Auxilio Vial": {
    particular: {
      conMembresia: 190,
      sinMembresia: 380,
    },
    servicio_publico: {
      conMembresia: 120,
      sinMembresia: null,
    },
  },
  Grúa: {
    particular: {
      conMembresia: null,
      sinMembresia: null,
    },
    servicio_publico: {
      conMembresia: null,
      sinMembresia: null,
    },
  },
} as const;

export default function ReportesPage() {
  const [form, setForm] = useState({
    nombreCliente: "",
    telefono: "",
    placas: "",
    marca: "",
    subMarca: "",
    color: "",
    serie: "",
    tipoServicio: "",
    ubicacion: "",
    linkUbicacion: "",
    descripcion: "",
  });

  const [membresia, setMembresia] = useState<MembresiaData | null>(null);
  const [ultimoReporte, setUltimoReporte] = useState<ReporteData | null>(null);
  const [cargandoMembresia, setCargandoMembresia] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "placas" || name === "serie"
          ? value.toUpperCase().trim()
          : value,
    }));
  };

  const normalizarPlacas = (valor: string) => valor.trim().toUpperCase();

  const membresiaActivaReal = useMemo(() => {
    if (!membresia) return false;
    if (membresia.estado !== "activa") return false;
    if (!membresia.vigencia) return false;

    const vigencia = new Date(membresia.vigencia);
    if (isNaN(vigencia.getTime())) return false;

    return vigencia >= new Date();
  }, [membresia]);

  const diasRestantesMembresia = useMemo(() => {
    if (!membresia?.vigencia) return null;

    const fechaVigencia = new Date(membresia.vigencia);
    if (isNaN(fechaVigencia.getTime())) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaVigencia.setHours(0, 0, 0, 0);

    const diferenciaMs = fechaVigencia.getTime() - hoy.getTime();
    return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
  }, [membresia]);

  const colorVigencia = useMemo(() => {
    if (!membresia) return "border-zinc-600 bg-zinc-800";
    if (!membresiaActivaReal) return "border-red-500 bg-red-950";
    if (diasRestantesMembresia !== null && diasRestantesMembresia <= 2) {
      return "border-red-500 bg-red-950";
    }
    if (diasRestantesMembresia !== null && diasRestantesMembresia <= 5) {
      return "border-yellow-500 bg-yellow-950";
    }
    return "border-green-500 bg-green-950";
  }, [membresia, membresiaActivaReal, diasRestantesMembresia]);

  const textoVigencia = useMemo(() => {
    if (!membresia) return "Cliente sin membresía registrada.";
    if (!membresiaActivaReal) return "La membresía no está activa o ya venció.";
    if (diasRestantesMembresia === null) return "Vigencia sin formato válido.";
    if (diasRestantesMembresia < 0) {
      return `Membresía vencida hace ${Math.abs(diasRestantesMembresia)} día(s).;`
    }
    if (diasRestantesMembresia === 0) return "La membresía vence hoy.";
    return `Faltan ${diasRestantesMembresia} día(s) para vencer;`
  }, [membresia, membresiaActivaReal, diasRestantesMembresia]);

  const verificarMembresia = async (placas: string) => {
    const placasLimpias = normalizarPlacas(placas);

    if (!placasLimpias) {
      setMembresia(null);
      return;
    }

    setCargandoMembresia(true);

    try {
      const q = query(
        collection(db, "miembros_asclick"),
        where("placas", "==", placasLimpias)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data() as MembresiaData;

        setMembresia(data);

        setForm((prev) => ({
          ...prev,
          placas: placasLimpias,
          nombreCliente: data.nombre || prev.nombreCliente,
          telefono: data.telefono || prev.telefono,
          marca: data.marca || prev.marca,
          subMarca: data.subMarca || prev.subMarca,
          color: data.color || prev.color,
          serie: data.serie || prev.serie,
        }));
      } else {
        setMembresia(null);
        setForm((prev) => ({
          ...prev,
          placas: placasLimpias,
        }));
      }
    } catch (error) {
      console.error("Error al verificar membresía:", error);
      setMembresia(null);
    } finally {
      setCargandoMembresia(false);
    }
  };

  const costoServicio = useMemo(() => {
    if (!form.tipoServicio) return null;

    const tipoCliente = membresia?.tipoCliente || "particular";
    const servicio = TARIFAS[form.tipoServicio as keyof typeof TARIFAS];

    if (!servicio) return null;

    const grupo = servicio[tipoCliente as "particular" | "servicio_publico"];
    if (!grupo) return null;

    return membresiaActivaReal ? grupo.conMembresia : grupo.sinMembresia;
  }, [form.tipoServicio, membresia, membresiaActivaReal]);

  const textoCosto = useMemo(() => {
    if (!form.tipoServicio) return "Selecciona un tipo de servicio.";
    if (costoServicio === null) return "Tarifa no definida.";
    return `$${costoServicio.toLocaleString("es-MX")}`;
  }, [form.tipoServicio, costoServicio]);

  const datosAuto = useMemo(() => {
    return {
      marca: form.marca || "N/A",
      subMarca: form.subMarca || "N/A",
      placas: normalizarPlacas(form.placas) || "N/A",
      color: form.color || "N/A",
      serie: form.serie || "N/A",
    };
  }, [form.marca, form.subMarca, form.placas, form.color, form.serie]);

  const guardarReporte = async () => {
    if (
      !form.nombreCliente ||
      !form.telefono ||
      !form.placas ||
      !form.tipoServicio
    ) {
      alert("Completa nombre, teléfono, placas y tipo de servicio.");
      return;
    }

    setGuardando(true);

    try {
      const reporteData = {
        nombreCliente: form.nombreCliente.trim(),
        telefono: form.telefono.trim(),
        placas: normalizarPlacas(form.placas),
        marca: form.marca.trim(),
        subMarca: form.subMarca.trim(),
        color: form.color.trim(),
        serie: form.serie.trim().toUpperCase(),
        tipoServicio: form.tipoServicio,
        ubicacion: form.ubicacion.trim(),
        linkUbicacion: form.linkUbicacion.trim(),
        descripcion: form.descripcion.trim(),
        membresiaActiva: membresiaActivaReal,
        numeroMembresia: membresia?.numeroMembresia || "",
        plan: membresia?.plan || "",
        vigencia: membresia?.vigencia || "",
        estadoMembresia: membresia?.estado || "",
        tipoCliente: membresia?.tipoCliente || "particular",
        costoServicio,
        fecha: serverTimestamp(),
        estado: "pendiente",
      };

      await addDoc(collection(db, "reportes_asclick"), reporteData);

      setUltimoReporte({
        nombreCliente: reporteData.nombreCliente,
        telefono: reporteData.telefono,
        placas: reporteData.placas,
        tipoServicio: reporteData.tipoServicio,
        ubicacion: reporteData.ubicacion,
        linkUbicacion: reporteData.linkUbicacion,
        descripcion: reporteData.descripcion,
        membresiaActiva: reporteData.membresiaActiva,
        plan: reporteData.plan,
        vigencia: reporteData.vigencia,
        tipoCliente: reporteData.tipoCliente,
        costoServicio: reporteData.costoServicio,
        marca: reporteData.marca,
        subMarca: reporteData.subMarca,
        serie: reporteData.serie,
        color: reporteData.color,
      });

      alert("Reporte guardado correctamente");

      setForm({
        nombreCliente: "",
        telefono: "",
        placas: "",
        marca: "",
        subMarca: "",
        color: "",
        serie: "",
        tipoServicio: "",
        ubicacion: "",
        linkUbicacion: "",
        descripcion: "",
      });

      setMembresia(null);
    } catch (error) {
      console.error("Error al guardar reporte:", error);
      alert("Error al guardar reporte");
    } finally {
      setGuardando(false);
    }
  };

  const abrirWhatsApp = (numero: string, destino: string) => {
    const data =
      ultimoReporte || {
        nombreCliente: form.nombreCliente,
        telefono: form.telefono,
        placas: normalizarPlacas(form.placas),
        marca: form.marca,
        subMarca: form.subMarca,
        color: form.color,
        serie: form.serie,
        tipoServicio: form.tipoServicio,
        ubicacion: form.ubicacion,
        linkUbicacion: form.linkUbicacion,
        descripcion: form.descripcion,
        membresiaActiva: membresiaActivaReal,
        plan: membresia?.plan || "",
        vigencia: membresia?.vigencia || "",
        tipoCliente: membresia?.tipoCliente || "particular",
        costoServicio,
      };

    const mensaje = `🚨 SERVICIO AS CLICK

Área asignada: ${destino}
Cliente: ${data.nombreCliente}

DATOS DEL AUTO
Marca: ${data.marca || "N/A"}
Sub marca: ${data.subMarca || "N/A"}
Placas: ${data.placas || "N/A"}
Color: ${data.color || "N/A"}
Serie: ${data.serie || "N/A"}

Servicio solicitado: ${data.tipoServicio}
Tipo de cliente: ${data.tipoCliente}
Costo aplicable: ${
      data.costoServicio !== null
        ? "$" + data.costoServicio.toLocaleString("es-MX")
        : "Tarifa no definida"
    }

Ubicación reportada:
${data.ubicacion || "Sin dirección"}

Link de ubicación:
${data.linkUbicacion || "Sin link de ubicación"}

Descripción:
${data.descripcion || "Sin descripción"}

Membresía activa: ${data.membresiaActiva ? "Sí" : "No"}
Plan: ${data.plan || "N/A"}
Vigencia: ${data.vigencia || "N/A"}`;

    const url = `https://wa.me/52${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const abrirGoogleMaps = () => {
    const link = form.linkUbicacion?.trim();

    if (link) {
      window.open(link, "_blank");
      return;
    }

    if (form.ubicacion?.trim()) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        form.ubicacion
      )}`;
      window.open(url, "_blank");
      return;
    }

    alert("No hay ubicación para abrir.");
  };

  const abrirWaze = () => {
    const link = form.linkUbicacion?.trim();

    if (link) {
      window.open(link, "_blank");
      return;
    }

    if (form.ubicacion?.trim()) {
      const url = `https://waze.com/ul?q=${encodeURIComponent(form.ubicacion)}`;
      window.open(url, "_blank");
      return;
    }

    alert("No hay ubicación para abrir.");
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-3xl mx-auto bg-zinc-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2">Tomar Reporte</h1>
        <p className="text-zinc-400 mb-8">Captura del servicio de As Click</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="nombreCliente"
            placeholder="Nombre del cliente"
            value={form.nombreCliente}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <input
            name="telefono"
            placeholder="Teléfono"
            value={form.telefono}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <input
            name="placas"
            placeholder="Placas"
            value={form.placas}
            onChange={handleChange}
            onBlur={() => verificarMembresia(form.placas)}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <select
            name="tipoServicio"
            value={form.tipoServicio}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          >
            <option value="">Tipo de servicio</option>
            <option value="Ajustador">Ajustador</option>
            <option value="Abogado">Abogado</option>
            <option value="Auxilio Vial">Auxilio Vial</option>
            <option value="Grúa">Grúa</option>
          </select>

          <input
            name="marca"
            placeholder="Marca del auto"
            value={form.marca}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <input
            name="subMarca"
            placeholder="Sub marca del auto"
            value={form.subMarca}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <input
            name="color"
            placeholder="Color del auto"
            value={form.color}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <input
            name="serie"
            placeholder="Serie del auto"
            value={form.serie}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <input
            name="ubicacion"
            placeholder="Ubicación escrita"
            value={form.ubicacion}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600 md:col-span-2"
          />

          <input
            name="linkUbicacion"
            placeholder="Pega aquí el link de ubicación que mande el cliente"
            value={form.linkUbicacion}
            onChange={handleChange}
            className="p-3 rounded-lg bg-zinc-700 border border-zinc-600 md:col-span-2"
          />

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={abrirGoogleMaps}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
            >
              Abrir en Google Maps
            </button>

            <button
              type="button"
              onClick={abrirWaze}
              className="bg-sky-500 hover:bg-sky-600 text-black font-bold py-3 rounded-lg"
            >
              Abrir en Waze
            </button>
          </div>
        </div>

        <div className="mt-4">
          {cargandoMembresia ? (
            <div className="bg-zinc-700 border border-zinc-500 p-3 rounded-lg text-sm">
              Verificando membresía...
            </div>
          ) : membresia ? (
            <div className={`${colorVigencia} border p-3 rounded-lg text-sm`}>
              <p className="font-bold">Cliente con membresía</p>
              <p>Número: {membresia.numeroMembresia || "N/A"}</p>
              <p>Plan: {membresia.plan || "N/A"}</p>
              <p>Vigencia: {membresia.vigencia || "N/A"}</p>
              <p>Estado: {membresia.estado || "N/A"}</p>
              <p>Tipo cliente: {membresia.tipoCliente || "N/A"}</p>
              <p className="font-semibold mt-1">{textoVigencia}</p>
            </div>
          ) : (
            <div className="bg-zinc-800 border border-zinc-600 p-3 rounded-lg text-sm text-zinc-300">
              Cliente sin membresía registrada.
            </div>
          )}
        </div>

        <div className="mt-4 border border-zinc-600 bg-zinc-900 rounded-lg p-4">
          <p className="font-bold text-white mb-2">Datos del auto</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
              <p className="text-zinc-400">Marca</p>
              <p className="font-semibold">{datosAuto.marca}</p>
            </div>

            <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
              <p className="text-zinc-400">Sub marca</p>
              <p className="font-semibold">{datosAuto.subMarca}</p>
            </div>

            <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
              <p className="text-zinc-400">Placas</p>
              <p className="font-semibold">{datosAuto.placas}</p>
            </div>

            <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
              <p className="text-zinc-400">Color</p>
              <p className="font-semibold">{datosAuto.color}</p>
            </div>

            <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700 md:col-span-2">
              <p className="text-zinc-400">Serie</p>
              <p className="font-semibold break-all">{datosAuto.serie}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 border border-cyan-500 bg-cyan-950 rounded-lg p-4">
          <p className="font-bold text-cyan-300">Costo del servicio</p>
          <p className="text-white text-2xl font-extrabold mt-1">{textoCosto}</p>
          <p className="text-sm text-cyan-100 mt-1">
            Se calcula automáticamente según servicio, membresía y tipo de cliente.
          </p>
        </div>

        <textarea
          name="descripcion"
          placeholder="Descripción del incidente"
          value={form.descripcion}
          onChange={handleChange}
          className="mt-4 w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 min-h-[120px]"
        />

        <button
          onClick={guardarReporte}
          disabled={guardando}
          className="mt-6 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 rounded-lg"
        >
          {guardando ? "Guardando..." : "Guardar Reporte"}
        </button>

        {(ultimoReporte || form.nombreCliente || form.placas) && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Enviar por WhatsApp</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => abrirWhatsApp("5543256343", "Ajustador")}
                className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg"
              >
                Enviar Ajustador
              </button>

              <button
                onClick={() => abrirWhatsApp("5543256343", "Abogado")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg"
              >
                Enviar Abogado
              </button>

              <button
                onClick={() => abrirWhatsApp("5543256343", "Grúa")}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg"
              >
                Enviar Grúa
              </button>

              <button
                onClick={() => abrirWhatsApp("5543256343", "Auxilio Vial")}
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 rounded-lg"
              >
                Enviar Auxilio
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}