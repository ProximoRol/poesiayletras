-- Contenido inicial de la página de Wagner (respuestas del 11-oct-2026).
-- Correr UNA vez en el SQL Editor después de las migraciones. Las fotos se suben desde el
-- panel («Mi perfil» y «Libros»): no van en el repo porque es público.

update public.perfil set
  nombre = 'Wagner Pérez Eulufí',
  frase = 'Poemas desde el silencio.',
  presentacion = E'Académico universitario y poeta.\nAquí comparto mis poemas y converso con quienes me leen.',
  biografia = 'W. P. Eulufí (1954) académico universitario y poeta. Su obra ha sido reconocida en concursos literarios y publicada en revistas y antologías chilenas. En 2025 publicó su poemario «Cincuenta poemas del silencio».',
  instagram = 'https://www.instagram.com/wagnerperezeulufi/',
  moderar_comentarios = false
where id = 1;

-- El libro no se vende por internet: sin enlaces de compra, la página ofrece pedirlo por WhatsApp.
insert into public.libros (titulo, subtitulo, anio, sinopsis, enlaces, orden, visible)
select 'Cincuenta poemas del silencio', 'Poemas', 2025, 'Su poemario publicado en 2025.', '[]'::jsonb, 0, true
where not exists (select 1 from public.libros where titulo = 'Cincuenta poemas del silencio');
