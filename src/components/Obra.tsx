import { Fragment } from "react";
import { bloques, type Categoria, type Linea } from "@/domain/textos";

// Muestra el texto tal como lo escribió el autor: cada Enter es un verso y cada línea en
// blanco una estrofa. React escapa todo; el único formato es *cursiva* y **negrita**.

function LineaObra({ linea }: { linea: Linea }) {
  return (
    <>
      {linea.map((tr, i) =>
        tr.negrita ? <strong key={i}>{tr.t}</strong> : tr.cursiva ? <em key={i}>{tr.t}</em> : <Fragment key={i}>{tr.t}</Fragment>,
      )}
    </>
  );
}

export function Obra({ cuerpo, categoria }: { cuerpo: string; categoria: Categoria }) {
  const verso = categoria === "poesia";
  return (
    <div className={`obra ${verso ? "verso" : "prosa"}`}>
      <div>
        {bloques(cuerpo).map((lineas, b) => (
          <p key={b}>
            {lineas.map((linea, l) => (
              <Fragment key={l}>
                {l > 0 && <br />}
                <LineaObra linea={linea} />
              </Fragment>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
