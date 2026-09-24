# -*- coding: utf-8 -*-
"""
Documentos de respaldo (certificado BPM, autorizaciones y licencia).

Toma los PDF escaneados que entrega el cliente en documentos/ y deja en
public/documentos/ una copia ligera para descargar, más una miniatura de la
primera página para la vista previa. Todo queda en public/documentos/ y no en
public/img/, porque `npm run images` borra y regenera esa carpeta entera.

Solo se recomprimen las imágenes escaneadas (se bajan a 200 ppp las que
pasan de 220); el contenido de cada documento no se altera.

Ejecutar con `npm run documentos` (requiere PyMuPDF y Pillow).
"""
import io
import os

import fitz  # PyMuPDF
from PIL import Image

RAIZ = os.getcwd()
ORIGEN = os.path.join(RAIZ, 'documentos')
SALIDA_PDF = os.path.join(RAIZ, 'public', 'documentos')

# (fichero del cliente, nombre publicado, título del PDF)
DOCUMENTOS = [
    ('04. CERTIFICADO BUENAS PRACTICAS DE MANUFACTURA - LABORATORIOS PACHECO.pdf',
     'certificado-bpm-073-2023',
     'Certificado de Buenas Prácticas de Manufactura N.º 073-2023 — Laboratorios Pacheco S.A.C.'),
    ('Autorizaciones DIGEMID.pdf',
     'autorizaciones-sanitarias-digemid',
     'Autorizaciones sanitarias DIGEMID — Laboratorios Pacheco S.A.C.'),
    ('c).-LICENCIA MUNICIPAL.pdf',
     'licencia-municipal-0598-2016',
     'Licencia municipal de funcionamiento N.º 0598-2016 — Laboratorios Pacheco S.A.C.'),
]

MINIATURA_ANCHO = 600
# La tarjeta solo enseña la mitad superior de la hoja (membrete y número),
# en proporción 4:3,3; la miniatura se recorta a esa zona.
MINIATURA_ALTO = round(MINIATURA_ANCHO * 3.3 / 4)


PPP_OBJETIVO = 200
CALIDAD = 72


def recomprimir(doc):
    """Escaneos a 200 ppp como máximo y JPEG q72: legibles al imprimir o al
    adjuntarlos a un expediente, sin el peso de los originales. Las imágenes
    pequeñas (la franja de CamScanner) se dejan como están."""
    hechas = set()
    for pagina in doc:
        ancho_pt = pagina.rect.width
        for info in pagina.get_images(full=True):
            xref = info[0]
            if xref in hechas:
                continue
            hechas.add(xref)
            bruto = doc.extract_image(xref)
            if bruto['width'] < 800:
                continue
            img = Image.open(io.BytesIO(bruto['image'])).convert('RGB')
            ancho_max = round(ancho_pt / 72 * PPP_OBJETIVO)
            if img.width > ancho_max:
                img = img.resize((ancho_max, round(img.height * ancho_max / img.width)), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, 'JPEG', quality=CALIDAD, optimize=True, progressive=True)
            if buf.tell() < len(bruto['image']):
                pagina.replace_image(xref, stream=buf.getvalue())


def kb(ruta):
    return os.path.getsize(ruta) / 1024


def preparar(origen, nombre, titulo):
    doc = fitz.open(origen)

    recomprimir(doc)
    doc.set_metadata({
        'title': titulo,
        'author': 'Laboratorios Pacheco S.A.C.',
        'subject': titulo,
        'creator': '',
        'producer': '',
        'keywords': 'DIGEMID, BPM, Laboratorios Pacheco',
    })

    destino = os.path.join(SALIDA_PDF, f'{nombre}.pdf')
    doc.save(destino, garbage=4, deflate=True, clean=True)

    # Miniatura de la primera página.
    pix = doc[0].get_pixmap(dpi=110)
    img = Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    alto = round(img.height * MINIATURA_ANCHO / img.width)
    img = img.resize((MINIATURA_ANCHO, alto), Image.LANCZOS).crop((0, 0, MINIATURA_ANCHO, MINIATURA_ALTO))
    base = os.path.join(SALIDA_PDF, nombre)
    img.save(f'{base}.webp', 'WEBP', quality=68, method=6)
    img.save(f'{base}.jpg', 'JPEG', quality=70, optimize=True, progressive=True)

    paginas = doc.page_count
    doc.close()
    print(f'  {nombre}.pdf  {kb(origen):6.0f} KB -> {kb(destino):5.0f} KB  · {paginas} pág'
          f'  · miniatura {MINIATURA_ANCHO}x{MINIATURA_ALTO}')
    return paginas


def main():
    os.makedirs(SALIDA_PDF, exist_ok=True)
    for fichero, nombre, titulo in DOCUMENTOS:
        preparar(os.path.join(ORIGEN, fichero), nombre, titulo)


if __name__ == '__main__':
    main()
