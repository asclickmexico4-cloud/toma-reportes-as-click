"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Servicio = {
  nombreCliente?: string;
  vehiculo?: string;
  marca?: string;
  submarca?: string;
  placas?: string;
  ubicacion?: string;
  estado?: string;
  operador?: string;
  descripcion?: string;
  telefono?: string;
  tipoServicio?: string;
  costoServicio?: number;
  estadoMembresia?: string;
  membresiaActiva?: boolean;
  numeroMembresia?: string;
  linkUbicacion?: string;
};

export default function ServicioPage() {
  const params = useParams();
  const servicioId = params.id as string;

  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    const cargarServicio = async () => {
      try {
        if (!servicioId) {
          setServicio(null);
          setLoading(false);
          return;
        }

        const ref = doc(db, "reportes_asclick", servicioId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setServicio(snap.data() as Servicio);
        } else {
          setServicio(null);
        }
      } catch (error) {
        console.error("Error al cargar servicio:", error);
        setServicio(null);
      } finally {
        setLoading(false);
      }
    };

    cargarServicio();
  }, [servicioId]);

  const aceptarServicio = async () => {
    try {
      setActualizando(true);

      const ref = doc(db, "reportes_asclick", servicioId);

      await updateDoc(ref, {
        estado: "en_proceso",
        fechaAceptado: serverTimestamp(),
      });

      setServicio((prev) =>
        prev
          ? {
              ...prev,
              estado: "en_proceso",
            }
          : prev
      );

      alert("Servicio aceptado correctamente");
    } catch (error) {
      console.error("Error al aceptar servicio:", error);
      alert("No se pudo aceptar el servicio");
    } finally {
      setActualizando(false);
    }
  };

  const marcarArribo = async () => {
    try {
      setActualizando(true);

      const ref = doc(db, "reportes_asclick", servicioId);

      await updateDoc(ref, {
        estado: "arribo",
        fechaArribo: serverTimestamp(),
      });

      setServicio((prev) =>
        prev
          ? {
              ...prev,
              estado: "arribo",
            }
          : prev
      );

      alert("Arribo marcado correctamente");
    } catch (error) {
      console.error("Error al marcar arribo:", error);
      alert("No se pudo marcar el arribo");
    } finally {
      setActualizando(false);
    }
  };

  const terminarServicio = async () => {
    try {
      setActualizando(true);

      const ref = doc(db, "reportes_asclick", servicioId);

      await updateDoc(ref, {
        estado: "terminado",
        fechaTermino: serverTimestamp(),
      });

      setServicio((prev) =>
        prev
          ? {
              ...prev,
              estado: "terminado",
            }
          : prev
      );

      alert("Servicio terminado correctamente");
    } catch (error) {
      console.error("Error al terminar servicio:", error);
      alert("No se pudo terminar el servicio");
    } finally {
      setActualizando(false);
    }
  };

  const renderBotonEstado = () => {
    if (!servicio) return null;

    if (servicio.estado === "pendiente") {
      return (
        <button
          onClick={aceptarServicio}
          disabled={actualizando}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "14px 18px",
            border: "none",
            borderRadius: 12,
            backgroundColor: "green",
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
            opacity: actualizando ? 0.7 : 1,
          }}
        >
          {actualizando ? "Aceptando..." : "Aceptar servicio"}
        </button>
      );
    }

    if (servicio.estado === "en_proceso") {
      return (
        <button
          onClick={marcarArribo}
          disabled={actualizando}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "14px 18px",
            border: "none",
            borderRadius: 12,
            backgroundColor: "#f59e0b",
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
            opacity: actualizando ? 0.7 : 1,
          }}
        >
          {actualizando ? "Guardando..." : "Marcar arribo"}
        </button>
      );
    }

    if (servicio.estado === "arribo") {
      return (
        <button
          onClick={terminarServicio}
          disabled={actualizando}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "14px 18px",
            border: "none",
            borderRadius: 12,
            backgroundColor: "#2563eb",
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
            opacity: actualizando ? 0.7 : 1,
          }}
        >
          {actualizando ? "Guardando..." : "Terminar servicio"}
        </button>
      );
    }

    if (servicio.estado === "terminado") {
      return (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            backgroundColor: "#dbeafe",
            color: "#1d4ed8",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Servicio terminado
        </div>
      );
    }

    return (
      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          backgroundColor: "#e5e7eb",
          color: "#374151",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        Estado actual: {servicio.estado || "sin estado"}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0f0f0f",
          color: "#ffffff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 18,
        }}
      >
        Cargando servicio...
      </div>
    );
  }

  if (!servicio) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0f0f0f",
          color: "#ffffff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 18,
        }}
      >
        Servicio no encontrado
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #111111 0%, #1b1b1b 100%)",
        padding: 20,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          padding: 24,
          borderRadius: 18,
          maxWidth: 560,
          width: "100%",
          boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
        }}
      >
        <h1
          style={{
            marginBottom: 20,
            fontSize: 28,
            fontWeight: "bold",
            color: "#111111",
            textAlign: "center",
          }}
        >
          Servicio As Click
        </h1>

        <div style={{ display: "grid", gap: 10, color: "#222222" }}>
          <p>
            <strong>Cliente:</strong> {servicio.nombreCliente || "Sin nombre"}
          </p>

          <p>
            <strong>Tipo de servicio:</strong>{" "}
            {servicio.tipoServicio || "No especificado"}
          </p>

          <p>
            <strong>Descripción:</strong>{" "}
            {servicio.descripcion || "Sin descripción"}
          </p>

          <p>
            <strong>Marca:</strong> {servicio.marca || "Sin marca"}
          </p>

          <p>
            <strong>Vehículo:</strong> {servicio.vehiculo || "No especificado"}
          </p>

          <p>
            <strong>Submarca:</strong> {servicio.submarca || "No especificada"}
          </p>

          <p>
            <strong>Placas:</strong> {servicio.placas || "Sin placas"}
          </p>

          <p>
            <strong>Ubicación:</strong> {servicio.ubicacion || "Sin ubicación"}
          </p>

          <p>
            <strong>Teléfono:</strong> {servicio.telefono || "Sin teléfono"}
          </p>

          <p>
            <strong>Costo servicio:</strong>{" "}
            {servicio.costoServicio ? `$${servicio.costoServicio}` : "No definido"}
          </p>

          <p>
            <strong>Membresía:</strong>{" "}
            {servicio.membresiaActiva ? "Activa" : "No activa"}
          </p>

          <p>
            <strong>Estado membresía:</strong>{" "}
            {servicio.estadoMembresia || "No definido"}
          </p>

          <p>
            <strong>Número membresía:</strong>{" "}
            {servicio.numeroMembresia || "No disponible"}
          </p>

          <p>
            <strong>Estado:</strong> {servicio.estado || "Sin estado"}
          </p>
        </div>

        {servicio.linkUbicacion ? (
          <a
            href={servicio.linkUbicacion}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              marginTop: 18,
              textDecoration: "none",
            }}
          >
            <button
              style={{
                width: "100%",
                padding: "14px 18px",
                border: "none",
                borderRadius: 12,
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Abrir ubicación
            </button>
          </a>
        ) : null}

        {renderBotonEstado()}
      </div>
    </div>
  );
}