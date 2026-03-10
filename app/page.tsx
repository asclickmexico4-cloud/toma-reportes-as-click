import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">

      <div className="w-[420px] bg-zinc-800 p-10 rounded-xl shadow-xl text-center">

        <h1 className="text-3xl font-bold mb-2">
          Toma Reportes
        </h1>

        <h2 className="text-green-400 text-xl mb-6">
          AS CLICK
        </h2>

        <p className="opacity-70 mb-8">
          Sistema de control de servicios y membresías
        </p>

        <div className="flex flex-col gap-4">

          <Link
            href="/membresias"
            className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg text-center"
          >
            Membresías
          </Link>

          <Link
            href="/reportes"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg text-center"
          >
            Tomar Reporte
          </Link>

          <Link
            href="/historial"
            className="bg-zinc-700 hover:bg-zinc-600 py-3 rounded-lg text-center"
          >
            Historial de Servicios
          </Link>

        </div>

      </div>

    </main>
  );
}