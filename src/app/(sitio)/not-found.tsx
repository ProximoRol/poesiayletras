import Link from "next/link";

export default function NoEncontrado() {
  return (
    <section className="centro">
      <div className="estrecho">
        <span className="eyebrow">Página no encontrada</span>
        <h1 className="titulo-pagina">Este texto se <em>perdió</em> entre las hojas</h1>
        <p className="muted" style={{ marginBottom: 28 }}>Puede que lo hayan movido o que ya no esté publicado.</p>
        <Link href="/textos" className="btn btn-primary">Ver todos los textos</Link>
      </div>
    </section>
  );
}
