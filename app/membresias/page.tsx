<<<<<<< HEAD
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

type FormState = {
  nombre: string;
  telefono: string;
  marca: string;
  subMarca: string;
  color: string;
  placas: string;
  serie: string;
  plan: "mensual" | "anual" | "";
  tipoCliente: "particular" | "servicio_publico" | "";
  estado: "pendiente_activacion" | "activa" | "vencida" | "cancelada";
};

type MembresiaItem = {
  id: string;
  numeroMembresia: string;
  nombre: string;
  telefono: string;
  marca: string;
  subMarca: string;
  color: string;
  placas: string;
  serie: string;
  plan: string;
  tipoCliente: string;
  estado: string;
  fechaSolicitud?: string;
  inicioVigencia?: string;
  finVigencia?: string;
};

const initialForm: FormState = {
  nombre: "",
  telefono: "",
  marca: "",
  subMarca: "",
  color: "",
  placas: "",
  serie: "",
  plan: "",
  tipoCliente: "",
  estado: "pendiente_activacion",
};

export default function MembresiasPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [guardando, setGuardando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ultimoNumero, setUltimoNumero] = useState("");
  const [membresias, setMembresias] = useState<MembresiaItem[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const fechaSolicitud = useMemo(() => new Date(), []);
  const inicioVigencia = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d;
  }, []);

  const finVigencia = useMemo(() => {
    if (!form.plan) return null;

    const d = new Date(inicioVigencia);

    if (form.plan === "mensual") d.setMonth(d.getMonth() + 1);
    if (form.plan === "anual") d.setFullYear(d.getFullYear() + 1);

    return d;
  }, [form.plan, inicioVigencia]);

  const diasRestantesPreview = useMemo(() => {
    if (!finVigencia) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fin = new Date(finVigencia);
    fin.setHours(0, 0, 0, 0);

    const ms = fin.getTime() - hoy.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [finVigencia]);

  const colorVigencia =
    diasRestantesPreview === null
      ? "border-zinc-600 bg-zinc-800"
      : diasRestantesPreview <= 2
      ? "border-red-500 bg-red-950"
      : diasRestantesPreview <= 5
      ? "border-yellow-500 bg-yellow-950"
      : "border-green-500 bg-green-950";

  const membresiasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return membresias;

    return membresias.filter((m) =>
      [
        m.numeroMembresia,
        m.nombre,
        m.telefono,
        m.placas,
        m.marca,
        m.subMarca,
        m.color,
        m.serie,
        m.plan,
        m.tipoCliente,
        m.estado,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [busqueda, membresias]);

  useEffect(() => {
    cargarMembresias();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

  const limpiarFormulario = () => {
    setForm(initialForm);
    setEditandoId(null);
    setMensaje("");
    setError("");
  };

  const formatFecha = (fecha: Date | string | null | undefined) => {
    if (!fecha) return "N/A";
    const d = typeof fecha === "string" ? new Date(fecha) : fecha;
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("es-MX");
  };

  const cargarMembresias = async () => {
    try {
      const q = query(collection(db, "miembros_asclick"));
      const snap = await getDocs(q);

      const rows: MembresiaItem[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          numeroMembresia: data.numeroMembresia || "",
          nombre: data.nombre || "",
          telefono: data.telefono || "",
          marca: data.marca || "",
          subMarca: data.subMarca || "",
          color: data.color || "",
          placas: data.placas || "",
          serie: data.serie || "",
          plan: data.plan || "",
          tipoCliente: data.tipoCliente || "",
          estado: data.estado || "",
          fechaSolicitud: data.fechaSolicitud || "",
          inicioVigencia: data.inicioVigencia || "",
          finVigencia: data.finVigencia || "",
        };
      });

      rows.sort((a, b) =>
        (b.numeroMembresia || "").localeCompare(a.numeroMembresia || "")
      );

      setMembresias(rows);
    } catch (err) {
      console.error("Error al cargar membresías:", err);
      setError("No se pudieron cargar las membresías.");
    }
  };

  const validarFormulario = () => {
    if (
      !form.nombre.trim() ||
      !form.telefono.trim() ||
      !form.marca.trim() ||
      !form.subMarca.trim() ||
      !form.color.trim() ||
      !form.placas.trim() ||
      !form.serie.trim() ||
      !form.plan ||
      !form.tipoCliente
    ) {
      setError("Completa todos los campos obligatorios.");
      return false;
    }
    return true;
  };

  const validarPlacasDuplicadasAlta = async () => {
    const placas = form.placas.trim().toUpperCase();

    const q = query(
      collection(db, "miembros_asclick"),
      where("placas", "==", placas)
    );

    const snap = await getDocs(q);
    return !snap.empty;
  };

  const validarPlacasDuplicadasEdicion = async (idActual: string) => {
    const placas = form.placas.trim().toUpperCase();

    const q = query(
      collection(db, "miembros_asclick"),
      where("placas", "==", placas)
    );

    const snap = await getDocs(q);
    return snap.docs.some((d) => d.id !== idActual);
  };

  const generarNumeroMembresia = async () => {
    const contadorRef = doc(db, "config_asclick", "contador_membresias");

    const numero = await runTransaction(db, async (transaction) => {
      const contadorSnap = await transaction.get(contadorRef);

      let siguiente = 1;

      if (!contadorSnap.exists()) {
        transaction.set(contadorRef, {
          valor: 1,
          updatedAt: new Date().toISOString(),
        });
        siguiente = 1;
      } else {
        const actual = contadorSnap.data().valor || 0;
        siguiente = actual + 1;
        transaction.update(contadorRef, {
          valor: siguiente,
          updatedAt: new Date().toISOString(),
        });
      }

      return siguiente;
    });

    return `ASC-${String(numero).padStart(6, "0")};`
  };

  const guardarMembresia = async () => {
    setMensaje("");
    setError("");

    if (!validarFormulario()) return;

    setGuardando(true);

    try {
      const existePlacas = await validarPlacasDuplicadasAlta();

      if (existePlacas) {
        setError("Ya existe una membresía registrada con esas placas.");
        setGuardando(false);
        return;
      }

      const numeroMembresia = await generarNumeroMembresia();

      const data = {
        numeroMembresia,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        marca: form.marca.trim(),
        subMarca: form.subMarca.trim(),
        color: form.color.trim(),
        placas: form.placas.trim().toUpperCase(),
        serie: form.serie.trim().toUpperCase(),
        plan: form.plan,
        tipoCliente: form.tipoCliente,
        estado: "pendiente_activacion",
        fechaSolicitud: fechaSolicitud.toISOString(),
        inicioVigencia: inicioVigencia.toISOString(),
        finVigencia: finVigencia ? finVigencia.toISOString() : "",
        fechaAlta: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "miembros_asclick"), data);

      setUltimoNumero(numeroMembresia);
      setMensaje(`Membresía guardada correctamente: ${numeroMembresia}`);
      alert(`Membresía guardada correctamente: ${numeroMembresia}`);

      setForm(initialForm);
      await cargarMembresias();

      console.log("Guardado OK:", docRef.id, data);
    } catch (err) {
      console.error("Error al guardar membresía:", err);
      setError("Error al guardar la membresía.");
      alert("Error al guardar la membresía.");
    } finally {
      setGuardando(false);
    }
  };

  const cargarParaEditar = (item: MembresiaItem) => {
    setEditandoId(item.id);
    setMensaje("");
    setError("");

    setForm({
      nombre: item.nombre || "",
      telefono: item.telefono || "",
      marca: item.marca || "",
      subMarca: item.subMarca || "",
      color: item.color || "",
      placas: item.placas || "",
      serie: item.serie || "",
      plan: (item.plan as "mensual" | "anual" | "") || "",
      tipoCliente:
        (item.tipoCliente as "particular" | "servicio_publico" | "") || "",
      estado:
        (item.estado as
          | "pendiente_activacion"
          | "activa"
          | "vencida"
          | "cancelada") || "pendiente_activacion",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const actualizarMembresia = async () => {
    setMensaje("");
    setError("");

    if (!editandoId) {
      setError("No hay una membresía seleccionada para editar.");
      return;
    }

    if (!validarFormulario()) return;

    setActualizando(true);

    try {
      const existeDuplicada = await validarPlacasDuplicadasEdicion(editandoId);

      if (existeDuplicada) {
        setError("Ya existe otra membresía con esas placas.");
        setActualizando(false);
        return;
      }

      const ref = doc(db, "miembros_asclick", editandoId);

      const data = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        marca: form.marca.trim(),
        subMarca: form.subMarca.trim(),
        color: form.color.trim(),
        placas: form.placas.trim().toUpperCase(),
        serie: form.serie.trim().toUpperCase(),
        plan: form.plan,
        tipoCliente: form.tipoCliente,
        estado: form.estado,
        actualizadoEn: serverTimestamp(),
      };

      await updateDoc(ref, data);

      setMensaje("Membresía actualizada correctamente.");
      alert("Membresía actualizada correctamente.");
      setEditandoId(null);
      setForm(initialForm);
      await cargarMembresias();
    } catch (err) {
      console.error("Error al actualizar membresía:", err);
      setError("Error al actualizar la membresía.");
      alert("Error al actualizar la membresía.");
    } finally {
      setActualizando(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-zinc-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2">
            {editandoId ? "Editar Membresía" : "Alta de Membresías"}
          </h1>

          <p className="text-zinc-400 mb-8">
            {editandoId
              ? "Modifica los datos de la membresía seleccionada."
              : "Registro de clientes con membresía AS CLICK"}
          </p>

          {mensaje && (
            <div className="mb-4 rounded-lg border border-green-500 bg-green-950 p-4 text-green-200">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500 bg-red-950 p-4 text-red-200">
              {error}
            </div>
          )}

          {!editandoId && ultimoNumero && (
            <div className="mb-6 rounded-lg border border-cyan-500 bg-cyan-950 p-4">
              <p className="text-sm text-cyan-200">Último número generado</p>
              <p className="text-2xl font-bold text-cyan-300">{ultimoNumero}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="nombre"
              placeholder="Nombre del cliente"
              value={form.nombre}
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
              name="marca"
              placeholder="Marca"
              value={form.marca}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            />

            <input
              name="subMarca"
              placeholder="Sub marca"
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
              name="placas"
              placeholder="Placas"
              value={form.placas}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            />

            <input
              name="serie"
              placeholder="Serie / VIN"
              value={form.serie}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            />

            <select
              name="plan"
              value={form.plan}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            >
              <option value="">Selecciona plan</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>

            <select
              name="tipoCliente"
              value={form.tipoCliente}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            >
              <option value="">Tipo de cliente</option>
              <option value="particular">Particular</option>
              <option value="servicio_publico">Servicio público</option>
            </select>

            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600 md:col-span-2"
            >
              <option value="pendiente_activacion">Pendiente de activación</option>
              <option value="activa">Activa</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {!editandoId && (
            <div className={`mt-6 border rounded-xl p-4 ${colorVigencia}`}>
              <p className="font-bold mb-1">Vigencia automática</p>
              <p className="text-sm text-zinc-200">
                Fecha de solicitud: {formatFecha(fechaSolicitud)}
              </p>
              <p className="text-sm text-zinc-200">
                Inicio de vigencia: {formatFecha(inicioVigencia)}
              </p>
              <p className="text-sm text-zinc-200">
                Fin de vigencia: {formatFecha(finVigencia)}
              </p>
              <p className="text-sm text-zinc-200 mt-1">
                {diasRestantesPreview === null
                  ? "Selecciona un plan para calcular la vigencia."
                  : `Vista previa: ${diasRestantesPreview} día(s) de vigencia aproximada.`}
              </p>
              <p className="text-sm text-yellow-200 mt-2">
                Si contrata hoy, la membresía inicia 24 horas después. Si solicita servicio antes de ese momento, se cobra completo.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col md:flex-row gap-4">
            {editandoId ? (
              <>
                <button
                  onClick={actualizarMembresia}
                  disabled={actualizando}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 rounded-lg"
                >
                  {actualizando ? "Guardando cambios..." : "Guardar cambios"}
                </button>

                <button
                  onClick={limpiarFormulario}
                  className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-3 rounded-lg"
                >
                  Cancelar edición
                </button>
              </>
            ) : (
              <button
                onClick={guardarMembresia}
                disabled={guardando}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-black font-bold py-3 rounded-lg"
              >
                {guardando ? "Guardando..." : "Guardar Membresía"}
              </button>
            )}
          </div>
        </div>

        <div className="bg-zinc-800 rounded-2xl shadow-xl p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Membresías registradas</h2>
              <p className="text-zinc-400">
                Busca, revisa y edita membresías guardadas.
              </p>
            </div>

            <button
              onClick={cargarMembresias}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg font-semibold"
            >
              Recargar
            </button>
          </div>

          <input
            placeholder="Buscar por número, nombre, placas, teléfono, marca, color..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full mb-6 p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-zinc-300 border-b border-zinc-700">
                  <th className="p-3">Número</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Sub marca</th>
                  <th className="p-3">Color</th>
                  <th className="p-3">Placas</th>
                  <th className="p-3">Serie</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Inicio</th>
                  <th className="p-3">Fin</th>
                  <th className="p-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {membresiasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-4 text-center text-zinc-400">
                      No hay membresías para mostrar.
                    </td>
                  </tr>
                ) : (
                  membresiasFiltradas.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-700 hover:bg-zinc-700/40"
                    >
                      <td className="p-3 font-semibold text-cyan-300">
                        {item.numeroMembresia || "N/A"}
                      </td>
                      <td className="p-3">{item.nombre}</td>
                      <td className="p-3">{item.telefono}</td>
                      <td className="p-3">{item.marca}</td>
                      <td className="p-3">{item.subMarca}</td>
                      <td className="p-3">{item.color || "N/A"}</td>
                      <td className="p-3">{item.placas}</td>
                      <td className="p-3">{item.serie}</td>
                      <td className="p-3">{item.plan}</td>
                      <td className="p-3">{item.tipoCliente}</td>
                      <td className="p-3">
                        <span
                          className={
                            item.estado === "activa"
                              ? "text-green-400 font-semibold"
                              : item.estado === "pendiente_activacion"
                              ? "text-yellow-400 font-semibold"
                              : item.estado === "vencida"
                              ? "text-red-400 font-semibold"
                              : "text-zinc-300 font-semibold"
                          }
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.inicioVigencia
                          ? formatFecha(item.inicioVigencia)
                          : "N/A"}
                      </td>
                      <td className="p-3">
                        {item.finVigencia ? formatFecha(item.finVigencia) : "N/A"}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => cargarParaEditar(item)}
                          className="bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg font-semibold"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
=======
"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

type FormState = {
  nombre: string;
  telefono: string;
  marca: string;
  subMarca: string;
  color: string;
  placas: string;
  serie: string;
  plan: "mensual" | "anual" | "";
  tipoCliente: "particular" | "servicio_publico" | "";
  estado: "pendiente_activacion" | "activa" | "vencida" | "cancelada";
};

type MembresiaItem = {
  id: string;
  numeroMembresia: string;
  nombre: string;
  telefono: string;
  marca: string;
  subMarca: string;
  color: string;
  placas: string;
  serie: string;
  plan: string;
  tipoCliente: string;
  estado: string;
  fechaSolicitud?: string;
  inicioVigencia?: string;
  finVigencia?: string;
};

const initialForm: FormState = {
  nombre: "",
  telefono: "",
  marca: "",
  subMarca: "",
  color: "",
  placas: "",
  serie: "",
  plan: "",
  tipoCliente: "",
  estado: "pendiente_activacion",
};

export default function MembresiasPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [guardando, setGuardando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [ultimoNumero, setUltimoNumero] = useState("");
  const [membresias, setMembresias] = useState<MembresiaItem[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const fechaSolicitud = useMemo(() => new Date(), []);
  const inicioVigencia = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d;
  }, []);

  const finVigencia = useMemo(() => {
    if (!form.plan) return null;

    const d = new Date(inicioVigencia);

    if (form.plan === "mensual") d.setMonth(d.getMonth() + 1);
    if (form.plan === "anual") d.setFullYear(d.getFullYear() + 1);

    return d;
  }, [form.plan, inicioVigencia]);

  const diasRestantesPreview = useMemo(() => {
    if (!finVigencia) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fin = new Date(finVigencia);
    fin.setHours(0, 0, 0, 0);

    const ms = fin.getTime() - hoy.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [finVigencia]);

  const colorVigencia =
    diasRestantesPreview === null
      ? "border-zinc-600 bg-zinc-800"
      : diasRestantesPreview <= 2
      ? "border-red-500 bg-red-950"
      : diasRestantesPreview <= 5
      ? "border-yellow-500 bg-yellow-950"
      : "border-green-500 bg-green-950";

  const membresiasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return membresias;

    return membresias.filter((m) =>
      [
        m.numeroMembresia,
        m.nombre,
        m.telefono,
        m.placas,
        m.marca,
        m.subMarca,
        m.color,
        m.serie,
        m.plan,
        m.tipoCliente,
        m.estado,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [busqueda, membresias]);

  useEffect(() => {
    cargarMembresias();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

  const limpiarFormulario = () => {
    setForm(initialForm);
    setEditandoId(null);
    setMensaje("");
    setError("");
  };

  const formatFecha = (fecha: Date | string | null | undefined) => {
    if (!fecha) return "N/A";
    const d = typeof fecha === "string" ? new Date(fecha) : fecha;
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("es-MX");
  };

  const cargarMembresias = async () => {
    try {
      const q = query(collection(db, "miembros_asclick"));
      const snap = await getDocs(q);

      const rows: MembresiaItem[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          numeroMembresia: data.numeroMembresia || "",
          nombre: data.nombre || "",
          telefono: data.telefono || "",
          marca: data.marca || "",
          subMarca: data.subMarca || "",
          color: data.color || "",
          placas: data.placas || "",
          serie: data.serie || "",
          plan: data.plan || "",
          tipoCliente: data.tipoCliente || "",
          estado: data.estado || "",
          fechaSolicitud: data.fechaSolicitud || "",
          inicioVigencia: data.inicioVigencia || "",
          finVigencia: data.finVigencia || "",
        };
      });

      rows.sort((a, b) =>
        (b.numeroMembresia || "").localeCompare(a.numeroMembresia || "")
      );

      setMembresias(rows);
    } catch (err) {
      console.error("Error al cargar membresías:", err);
      setError("No se pudieron cargar las membresías.");
    }
  };

  const validarFormulario = () => {
    if (
      !form.nombre.trim() ||
      !form.telefono.trim() ||
      !form.marca.trim() ||
      !form.subMarca.trim() ||
      !form.color.trim() ||
      !form.placas.trim() ||
      !form.serie.trim() ||
      !form.plan ||
      !form.tipoCliente
    ) {
      setError("Completa todos los campos obligatorios.");
      return false;
    }
    return true;
  };

  const validarPlacasDuplicadasAlta = async () => {
    const placas = form.placas.trim().toUpperCase();

    const q = query(
      collection(db, "miembros_asclick"),
      where("placas", "==", placas)
    );

    const snap = await getDocs(q);
    return !snap.empty;
  };

  const validarPlacasDuplicadasEdicion = async (idActual: string) => {
    const placas = form.placas.trim().toUpperCase();

    const q = query(
      collection(db, "miembros_asclick"),
      where("placas", "==", placas)
    );

    const snap = await getDocs(q);
    return snap.docs.some((d) => d.id !== idActual);
  };

  const generarNumeroMembresia = async () => {
    const contadorRef = doc(db, "config_asclick", "contador_membresias");

    const numero = await runTransaction(db, async (transaction) => {
      const contadorSnap = await transaction.get(contadorRef);

      let siguiente = 1;

      if (!contadorSnap.exists()) {
        transaction.set(contadorRef, {
          valor: 1,
          updatedAt: new Date().toISOString(),
        });
        siguiente = 1;
      } else {
        const actual = contadorSnap.data().valor || 0;
        siguiente = actual + 1;
        transaction.update(contadorRef, {
          valor: siguiente,
          updatedAt: new Date().toISOString(),
        });
      }

      return siguiente;
    });

    return `ASC-${String(numero).padStart(6, "0")};`
  };

  const guardarMembresia = async () => {
    setMensaje("");
    setError("");

    if (!validarFormulario()) return;

    setGuardando(true);

    try {
      const existePlacas = await validarPlacasDuplicadasAlta();

      if (existePlacas) {
        setError("Ya existe una membresía registrada con esas placas.");
        setGuardando(false);
        return;
      }

      const numeroMembresia = await generarNumeroMembresia();

      const data = {
        numeroMembresia,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        marca: form.marca.trim(),
        subMarca: form.subMarca.trim(),
        color: form.color.trim(),
        placas: form.placas.trim().toUpperCase(),
        serie: form.serie.trim().toUpperCase(),
        plan: form.plan,
        tipoCliente: form.tipoCliente,
        estado: "pendiente_activacion",
        fechaSolicitud: fechaSolicitud.toISOString(),
        inicioVigencia: inicioVigencia.toISOString(),
        finVigencia: finVigencia ? finVigencia.toISOString() : "",
        fechaAlta: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "miembros_asclick"), data);

      setUltimoNumero(numeroMembresia);
      setMensaje(`Membresía guardada correctamente: ${numeroMembresia}`);
      alert(`Membresía guardada correctamente: ${numeroMembresia}`);

      setForm(initialForm);
      await cargarMembresias();

      console.log("Guardado OK:", docRef.id, data);
    } catch (err) {
      console.error("Error al guardar membresía:", err);
      setError("Error al guardar la membresía.");
      alert("Error al guardar la membresía.");
    } finally {
      setGuardando(false);
    }
  };

  const cargarParaEditar = (item: MembresiaItem) => {
    setEditandoId(item.id);
    setMensaje("");
    setError("");

    setForm({
      nombre: item.nombre || "",
      telefono: item.telefono || "",
      marca: item.marca || "",
      subMarca: item.subMarca || "",
      color: item.color || "",
      placas: item.placas || "",
      serie: item.serie || "",
      plan: (item.plan as "mensual" | "anual" | "") || "",
      tipoCliente:
        (item.tipoCliente as "particular" | "servicio_publico" | "") || "",
      estado:
        (item.estado as
          | "pendiente_activacion"
          | "activa"
          | "vencida"
          | "cancelada") || "pendiente_activacion",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const actualizarMembresia = async () => {
    setMensaje("");
    setError("");

    if (!editandoId) {
      setError("No hay una membresía seleccionada para editar.");
      return;
    }

    if (!validarFormulario()) return;

    setActualizando(true);

    try {
      const existeDuplicada = await validarPlacasDuplicadasEdicion(editandoId);

      if (existeDuplicada) {
        setError("Ya existe otra membresía con esas placas.");
        setActualizando(false);
        return;
      }

      const ref = doc(db, "miembros_asclick", editandoId);

      const data = {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        marca: form.marca.trim(),
        subMarca: form.subMarca.trim(),
        color: form.color.trim(),
        placas: form.placas.trim().toUpperCase(),
        serie: form.serie.trim().toUpperCase(),
        plan: form.plan,
        tipoCliente: form.tipoCliente,
        estado: form.estado,
        actualizadoEn: serverTimestamp(),
      };

      await updateDoc(ref, data);

      setMensaje("Membresía actualizada correctamente.");
      alert("Membresía actualizada correctamente.");
      setEditandoId(null);
      setForm(initialForm);
      await cargarMembresias();
    } catch (err) {
      console.error("Error al actualizar membresía:", err);
      setError("Error al actualizar la membresía.");
      alert("Error al actualizar la membresía.");
    } finally {
      setActualizando(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-zinc-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2">
            {editandoId ? "Editar Membresía" : "Alta de Membresías"}
          </h1>

          <p className="text-zinc-400 mb-8">
            {editandoId
              ? "Modifica los datos de la membresía seleccionada."
              : "Registro de clientes con membresía AS CLICK"}
          </p>

          {mensaje && (
            <div className="mb-4 rounded-lg border border-green-500 bg-green-950 p-4 text-green-200">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500 bg-red-950 p-4 text-red-200">
              {error}
            </div>
          )}

          {!editandoId && ultimoNumero && (
            <div className="mb-6 rounded-lg border border-cyan-500 bg-cyan-950 p-4">
              <p className="text-sm text-cyan-200">Último número generado</p>
              <p className="text-2xl font-bold text-cyan-300">{ultimoNumero}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="nombre"
              placeholder="Nombre del cliente"
              value={form.nombre}
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
              name="marca"
              placeholder="Marca"
              value={form.marca}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            />

            <input
              name="subMarca"
              placeholder="Sub marca"
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
              name="placas"
              placeholder="Placas"
              value={form.placas}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            />

            <input
              name="serie"
              placeholder="Serie / VIN"
              value={form.serie}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            />

            <select
              name="plan"
              value={form.plan}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            >
              <option value="">Selecciona plan</option>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>

            <select
              name="tipoCliente"
              value={form.tipoCliente}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600"
            >
              <option value="">Tipo de cliente</option>
              <option value="particular">Particular</option>
              <option value="servicio_publico">Servicio público</option>
            </select>

            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className="p-3 rounded-lg bg-zinc-700 border border-zinc-600 md:col-span-2"
            >
              <option value="pendiente_activacion">Pendiente de activación</option>
              <option value="activa">Activa</option>
              <option value="vencida">Vencida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          {!editandoId && (
            <div className={`mt-6 border rounded-xl p-4 ${colorVigencia}`}>
              <p className="font-bold mb-1">Vigencia automática</p>
              <p className="text-sm text-zinc-200">
                Fecha de solicitud: {formatFecha(fechaSolicitud)}
              </p>
              <p className="text-sm text-zinc-200">
                Inicio de vigencia: {formatFecha(inicioVigencia)}
              </p>
              <p className="text-sm text-zinc-200">
                Fin de vigencia: {formatFecha(finVigencia)}
              </p>
              <p className="text-sm text-zinc-200 mt-1">
                {diasRestantesPreview === null
                  ? "Selecciona un plan para calcular la vigencia."
                  : `Vista previa: ${diasRestantesPreview} día(s) de vigencia aproximada.`}
              </p>
              <p className="text-sm text-yellow-200 mt-2">
                Si contrata hoy, la membresía inicia 24 horas después. Si solicita servicio antes de ese momento, se cobra completo.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col md:flex-row gap-4">
            {editandoId ? (
              <>
                <button
                  onClick={actualizarMembresia}
                  disabled={actualizando}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 rounded-lg"
                >
                  {actualizando ? "Guardando cambios..." : "Guardar cambios"}
                </button>

                <button
                  onClick={limpiarFormulario}
                  className="flex-1 bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-3 rounded-lg"
                >
                  Cancelar edición
                </button>
              </>
            ) : (
              <button
                onClick={guardarMembresia}
                disabled={guardando}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-black font-bold py-3 rounded-lg"
              >
                {guardando ? "Guardando..." : "Guardar Membresía"}
              </button>
            )}
          </div>
        </div>

        <div className="bg-zinc-800 rounded-2xl shadow-xl p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Membresías registradas</h2>
              <p className="text-zinc-400">
                Busca, revisa y edita membresías guardadas.
              </p>
            </div>

            <button
              onClick={cargarMembresias}
              className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg font-semibold"
            >
              Recargar
            </button>
          </div>

          <input
            placeholder="Buscar por número, nombre, placas, teléfono, marca, color..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full mb-6 p-3 rounded-lg bg-zinc-700 border border-zinc-600"
          />

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-zinc-300 border-b border-zinc-700">
                  <th className="p-3">Número</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3">Sub marca</th>
                  <th className="p-3">Color</th>
                  <th className="p-3">Placas</th>
                  <th className="p-3">Serie</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Inicio</th>
                  <th className="p-3">Fin</th>
                  <th className="p-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {membresiasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-4 text-center text-zinc-400">
                      No hay membresías para mostrar.
                    </td>
                  </tr>
                ) : (
                  membresiasFiltradas.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-zinc-700 hover:bg-zinc-700/40"
                    >
                      <td className="p-3 font-semibold text-cyan-300">
                        {item.numeroMembresia || "N/A"}
                      </td>
                      <td className="p-3">{item.nombre}</td>
                      <td className="p-3">{item.telefono}</td>
                      <td className="p-3">{item.marca}</td>
                      <td className="p-3">{item.subMarca}</td>
                      <td className="p-3">{item.color || "N/A"}</td>
                      <td className="p-3">{item.placas}</td>
                      <td className="p-3">{item.serie}</td>
                      <td className="p-3">{item.plan}</td>
                      <td className="p-3">{item.tipoCliente}</td>
                      <td className="p-3">
                        <span
                          className={
                            item.estado === "activa"
                              ? "text-green-400 font-semibold"
                              : item.estado === "pendiente_activacion"
                              ? "text-yellow-400 font-semibold"
                              : item.estado === "vencida"
                              ? "text-red-400 font-semibold"
                              : "text-zinc-300 font-semibold"
                          }
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.inicioVigencia
                          ? formatFecha(item.inicioVigencia)
                          : "N/A"}
                      </td>
                      <td className="p-3">
                        {item.finVigencia ? formatFecha(item.finVigencia) : "N/A"}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => cargarParaEditar(item)}
                          className="bg-blue-500 hover:bg-blue-600 px-3 py-2 rounded-lg font-semibold"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
>>>>>>> 83fcb5c5b5a521ad311fed5da20f218b4a2fed05
}