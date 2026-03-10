<<<<<<< HEAD
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

type ReporteItem = {
  id: string;
  nombreCliente: string;
  telefono: string;
  placas: string;
  tipoServicio: string;
  ubicacion: string;
  linkUbicacion: string;
  descripcion: string;
  membresiaActiva: boolean;
  numeroMembresia: string;
  plan: string;
  vigencia: string;
  estadoMembresia: string;
  tipoCliente: string;
  marca: string;
  subMarca: string;
  serie: string;
  costoServicio: number | null;
  estado: string;
  fecha: any;
};

export default function HistorialPage() {
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    setCargando(true);
    setError("");

    try {
      const q = query(collection(db, "reportes_asclick"));
      const snap = await getDocs(q);

      const rows: ReporteItem[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();

        return {
          id: docSnap.id,
          nombreCliente: d.nombreCliente || "",
          telefono: d.telefono || "",
          placas: d.placas || "",
          tipoServicio: d.tipoServicio || "",
          ubicacion: d.ubicacion || "",
          linkUbicacion: d.linkUbicacion || "",
          descripcion: d.descripcion || "",
          membresiaActiva: !!d.membresiaActiva,
          numeroMembresia: d.numeroMembresia || "",
          plan: d.plan || "",
          vigencia: d.vigencia || "",
          estadoMembresia: d.estadoMembresia || "",
          tipoCliente: d.tipoCliente || "",
          marca: d.marca || "",
          subMarca: d.subMarca || "",
          serie: d.serie || "",
          costoServicio:
            typeof d.costoServicio === "number" ? d.costoServicio : null,
          estado: d.estado || "",
          fecha: d.fecha || null,
        };
      });

      rows.sort((a, b) => {
        const aTime = a.fecha?.seconds || 0;
        const bTime = b.fecha?.seconds || 0;
        return bTime - aTime;
      });

      setReportes(rows);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      setError("No se pudo cargar el historial de servicios.");
    } finally {
      setCargando(false);
    }
  };

  const reportesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return reportes;

    return reportes.filter((r) =>
      [
        r.nombreCliente,
        r.telefono,
        r.placas,
        r.tipoServicio,
        r.tipoCliente,
        r.numeroMembresia,
        r.plan,
        r.estado,
        r.marca,
        r.subMarca,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [busqueda, reportes]);

  const formatFecha = (fecha: any) => {
    if (!fecha) return "N/A";

    if (fecha?.seconds) {
      return new Date(fecha.seconds * 1000).toLocaleString("es-MX");
    }

    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "N/A";

    return d.toLocaleString("es-MX");
  };

  const abrirGoogleMaps = (linkUbicacion: string, ubicacion: string) => {
    const link = linkUbicacion?.trim();

    if (link) {
      window.open(link, "_blank");
      return;
    }

    if (ubicacion?.trim()) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        ubicacion
      )}`;
      window.open(url, "_blank");
      return;
    }

    alert("No hay ubicación para abrir.");
  };

  const abrirWaze = (linkUbicacion: string, ubicacion: string) => {
    const link = linkUbicacion?.trim();

    if (link) {
      window.open(link, "_blank");
      return;
    }

    if (ubicacion?.trim()) {
      const url = `https://waze.com/ul?q=${encodeURIComponent(ubicacion)};`
      window.open(url, "_blank");
      return;
    }

    alert("No hay ubicación para abrir.");
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-7xl mx-auto bg-zinc-800 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Historial de Servicios</h1>
            <p className="text-zinc-400">
              Consulta todos los reportes guardados en AS CLICK.
            </p>
          </div>

          <button
            onClick={cargarReportes}
            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg font-semibold"
          >
            Recargar
          </button>
        </div>

        <input
          placeholder="Buscar por cliente, placas, teléfono, servicio, plan..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full mb-6 p-3 rounded-lg bg-zinc-700 border border-zinc-600"
        />

        {cargando ? (
          <div className="text-zinc-300">Cargando historial...</div>
        ) : error ? (
          <div className="rounded-lg border border-red-500 bg-red-950 p-4 text-red-200">
            {error}
          </div>
        ) : reportesFiltrados.length === 0 ? (
          <div className="rounded-lg border border-zinc-600 bg-zinc-900 p-6 text-zinc-300">
            No hay servicios guardados.
          </div>
        ) : (
          <div className="grid gap-5">
            {reportesFiltrados.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Info label="Cliente" value={r.nombreCliente} />
                  <Info label="Teléfono" value={r.telefono} />
                  <Info label="Placas" value={r.placas} />
                  <Info label="Servicio" value={r.tipoServicio} />
                  <Info label="Tipo cliente" value={r.tipoCliente || "N/A"} />
                  <Info
                    label="Costo"
                    value={
                      r.costoServicio !== null
                        ? `$${r.costoServicio.toLocaleString("es-MX")}`
                        : "Tarifa no definida"
                    }
                  />
                  <Info
                    label="Membresía"
                    value={r.membresiaActiva ? "Sí" : "No"}
                  />
                  <Info label="Número membresía" value={r.numeroMembresia || "N/A"} />
                  <Info label="Plan" value={r.plan || "N/A"} />
                  <Info label="Vigencia" value={r.vigencia || "N/A"} />
                  <Info label="Estado membresía" value={r.estadoMembresia || "N/A"} />
                  <Info label="Fecha" value={formatFecha(r.fecha)} />
                  <Info label="Marca" value={r.marca || "N/A"} />
                  <Info label="Sub marca" value={r.subMarca || "N/A"} />
                  <Info label="Serie" value={r.serie || "N/A"} />
                  <Info label="Estado reporte" value={r.estado || "pendiente"} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
                    <p className="text-zinc-400 text-sm">Ubicación</p>
                    <p>{r.ubicacion || "Sin ubicación escrita"}</p>
                  </div>

                  <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
                    <p className="text-zinc-400 text-sm">Descripción</p>
                    <p>{r.descripcion || "Sin descripción"}</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      onClick={() => abrirGoogleMaps(r.linkUbicacion, r.ubicacion)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
                    >
                      Abrir en Google Maps
                    </button>

                    <button
                      onClick={() => abrirWaze(r.linkUbicacion, r.ubicacion)}
                      className="bg-sky-500 hover:bg-sky-600 text-black font-bold py-3 px-4 rounded-lg"
                    >
                      Abrir en Waze
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className="font-semibold break-words">{value}</p>
    </div>
  );
=======
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

type ReporteItem = {
  id: string;
  nombreCliente: string;
  telefono: string;
  placas: string;
  tipoServicio: string;
  ubicacion: string;
  linkUbicacion: string;
  descripcion: string;
  membresiaActiva: boolean;
  numeroMembresia: string;
  plan: string;
  vigencia: string;
  estadoMembresia: string;
  tipoCliente: string;
  marca: string;
  subMarca: string;
  serie: string;
  costoServicio: number | null;
  estado: string;
  fecha: any;
};

export default function HistorialPage() {
  const [reportes, setReportes] = useState<ReporteItem[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    setCargando(true);
    setError("");

    try {
      const q = query(collection(db, "reportes_asclick"));
      const snap = await getDocs(q);

      const rows: ReporteItem[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();

        return {
          id: docSnap.id,
          nombreCliente: d.nombreCliente || "",
          telefono: d.telefono || "",
          placas: d.placas || "",
          tipoServicio: d.tipoServicio || "",
          ubicacion: d.ubicacion || "",
          linkUbicacion: d.linkUbicacion || "",
          descripcion: d.descripcion || "",
          membresiaActiva: !!d.membresiaActiva,
          numeroMembresia: d.numeroMembresia || "",
          plan: d.plan || "",
          vigencia: d.vigencia || "",
          estadoMembresia: d.estadoMembresia || "",
          tipoCliente: d.tipoCliente || "",
          marca: d.marca || "",
          subMarca: d.subMarca || "",
          serie: d.serie || "",
          costoServicio:
            typeof d.costoServicio === "number" ? d.costoServicio : null,
          estado: d.estado || "",
          fecha: d.fecha || null,
        };
      });

      rows.sort((a, b) => {
        const aTime = a.fecha?.seconds || 0;
        const bTime = b.fecha?.seconds || 0;
        return bTime - aTime;
      });

      setReportes(rows);
    } catch (err) {
      console.error("Error al cargar historial:", err);
      setError("No se pudo cargar el historial de servicios.");
    } finally {
      setCargando(false);
    }
  };

  const reportesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return reportes;

    return reportes.filter((r) =>
      [
        r.nombreCliente,
        r.telefono,
        r.placas,
        r.tipoServicio,
        r.tipoCliente,
        r.numeroMembresia,
        r.plan,
        r.estado,
        r.marca,
        r.subMarca,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [busqueda, reportes]);

  const formatFecha = (fecha: any) => {
    if (!fecha) return "N/A";

    if (fecha?.seconds) {
      return new Date(fecha.seconds * 1000).toLocaleString("es-MX");
    }

    const d = new Date(fecha);
    if (isNaN(d.getTime())) return "N/A";

    return d.toLocaleString("es-MX");
  };

  const abrirGoogleMaps = (linkUbicacion: string, ubicacion: string) => {
    const link = linkUbicacion?.trim();

    if (link) {
      window.open(link, "_blank");
      return;
    }

    if (ubicacion?.trim()) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        ubicacion
      )}`;
      window.open(url, "_blank");
      return;
    }

    alert("No hay ubicación para abrir.");
  };

  const abrirWaze = (linkUbicacion: string, ubicacion: string) => {
    const link = linkUbicacion?.trim();

    if (link) {
      window.open(link, "_blank");
      return;
    }

    if (ubicacion?.trim()) {
      const url = `https://waze.com/ul?q=${encodeURIComponent(ubicacion)};`
      window.open(url, "_blank");
      return;
    }

    alert("No hay ubicación para abrir.");
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-7xl mx-auto bg-zinc-800 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Historial de Servicios</h1>
            <p className="text-zinc-400">
              Consulta todos los reportes guardados en AS CLICK.
            </p>
          </div>

          <button
            onClick={cargarReportes}
            className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg font-semibold"
          >
            Recargar
          </button>
        </div>

        <input
          placeholder="Buscar por cliente, placas, teléfono, servicio, plan..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full mb-6 p-3 rounded-lg bg-zinc-700 border border-zinc-600"
        />

        {cargando ? (
          <div className="text-zinc-300">Cargando historial...</div>
        ) : error ? (
          <div className="rounded-lg border border-red-500 bg-red-950 p-4 text-red-200">
            {error}
          </div>
        ) : reportesFiltrados.length === 0 ? (
          <div className="rounded-lg border border-zinc-600 bg-zinc-900 p-6 text-zinc-300">
            No hay servicios guardados.
          </div>
        ) : (
          <div className="grid gap-5">
            {reportesFiltrados.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Info label="Cliente" value={r.nombreCliente} />
                  <Info label="Teléfono" value={r.telefono} />
                  <Info label="Placas" value={r.placas} />
                  <Info label="Servicio" value={r.tipoServicio} />
                  <Info label="Tipo cliente" value={r.tipoCliente || "N/A"} />
                  <Info
                    label="Costo"
                    value={
                      r.costoServicio !== null
                        ? `$${r.costoServicio.toLocaleString("es-MX")}`
                        : "Tarifa no definida"
                    }
                  />
                  <Info
                    label="Membresía"
                    value={r.membresiaActiva ? "Sí" : "No"}
                  />
                  <Info label="Número membresía" value={r.numeroMembresia || "N/A"} />
                  <Info label="Plan" value={r.plan || "N/A"} />
                  <Info label="Vigencia" value={r.vigencia || "N/A"} />
                  <Info label="Estado membresía" value={r.estadoMembresia || "N/A"} />
                  <Info label="Fecha" value={formatFecha(r.fecha)} />
                  <Info label="Marca" value={r.marca || "N/A"} />
                  <Info label="Sub marca" value={r.subMarca || "N/A"} />
                  <Info label="Serie" value={r.serie || "N/A"} />
                  <Info label="Estado reporte" value={r.estado || "pendiente"} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
                    <p className="text-zinc-400 text-sm">Ubicación</p>
                    <p>{r.ubicacion || "Sin ubicación escrita"}</p>
                  </div>

                  <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
                    <p className="text-zinc-400 text-sm">Descripción</p>
                    <p>{r.descripcion || "Sin descripción"}</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      onClick={() => abrirGoogleMaps(r.linkUbicacion, r.ubicacion)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"
                    >
                      Abrir en Google Maps
                    </button>

                    <button
                      onClick={() => abrirWaze(r.linkUbicacion, r.ubicacion)}
                      className="bg-sky-500 hover:bg-sky-600 text-black font-bold py-3 px-4 rounded-lg"
                    >
                      Abrir en Waze
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800 p-3 border border-zinc-700">
      <p className="text-zinc-400 text-sm">{label}</p>
      <p className="font-semibold break-words">{value}</p>
    </div>
  );
>>>>>>> 83fcb5c5b5a521ad311fed5da20f218b4a2fed05
}