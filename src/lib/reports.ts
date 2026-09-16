import jsPDF from "jspdf";

import {
  AREAS,
  FORM_FIELDS,
  STATUS,
  TYPES,
  formatDate,
  formatDateTime,
  type Activity,
} from "./cmg";

const NAVY = { r: 26, g: 48, b: 74 };
const AMBER = { r: 214, g: 148, b: 46 };

export type ReportPhoto = { caption: string | null; dataUrl: string; format: "JPEG" | "PNG" };

function header(doc: jsPDF, subtitle: string) {
  doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  doc.rect(0, 0, 210, 26, "F");
  doc.setFillColor(AMBER.r, AMBER.g, AMBER.b);
  doc.rect(0, 26, 210, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CMG", 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Central de Monitoramento & Gestão · Torre Meridian", 30, 12);
  doc.text(subtitle, 30, 18);
  doc.setTextColor(30, 30, 30);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `CMG — Documento gerado em ${new Date().toLocaleString("pt-BR")} · Uso interno`,
      14,
      289,
    );
    doc.text(`${page}/${pages}`, 196, 289, { align: "right" });
  }
}

function sectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFillColor(240, 243, 247);
  doc.rect(14, y - 5, 182, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(NAVY.r, NAVY.g, NAVY.b);
  doc.text(text.toUpperCase(), 16, y);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  return y + 8;
}

export async function buildActivityReport(
  activity: Activity,
  analystName: string,
  photos: ReportPhoto[],
) {
  const doc = new jsPDF();
  header(doc, "Relatório Técnico de Atividade");

  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(doc.splitTextToSize(activity.title, 182), 14, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta: [string, string][] = [
    ["Tipo de execução", TYPES[activity.activity_type]],
    ["Área de atuação", AREAS[activity.area]],
    ["Local / pavimento", activity.location || "—"],
    ["Analista responsável", analystName],
    ["Data programada", formatDate(activity.scheduled_date)],
    ["Situação", STATUS[activity.status]],
    ["Conclusão", formatDateTime(activity.completed_at)],
  ];
  meta.forEach(([label, value]) => {
    doc.setTextColor(110, 110, 110);
    doc.text(label, 14, y);
    doc.setTextColor(30, 30, 30);
    doc.text(doc.splitTextToSize(value, 110), 70, y);
    y += 6;
  });

  if (activity.description) {
    y = sectionTitle(doc, "Escopo delegado", y + 6);
    const lines = doc.splitTextToSize(activity.description, 182);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  }

  y = sectionTitle(doc, "Registro de execução", y + 6);
  FORM_FIELDS[activity.activity_type].forEach((field) => {
    const value = activity.form_data?.[field.key] || "—";
    if (y > 260) {
      doc.addPage();
      header(doc, "Relatório Técnico de Atividade");
      y = 40;
    }
    doc.setFont("helvetica", "bold");
    doc.text(field.label, 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, 182);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  });

  if (photos.length) {
    doc.addPage();
    header(doc, "Registro Fotográfico");
    y = 40;
    for (const photo of photos) {
      if (y > 210) {
        doc.addPage();
        header(doc, "Registro Fotográfico");
        y = 40;
      }
      try {
        doc.addImage(photo.dataUrl, photo.format, 14, y, 88, 66);
      } catch {
        doc.text("Imagem indisponível", 14, y + 10);
      }
      doc.setFontSize(9);
      const caption = doc.splitTextToSize(photo.caption || "Sem legenda", 88);
      doc.text(caption, 108, y + 8);
      doc.setFontSize(10);
      y += 74;
    }
  }

  footer(doc);
  return doc;
}

export function exportActivitiesPdf(
  rows: (Activity & { analyst: string })[],
  filterLabel: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFillColor(NAVY.r, NAVY.g, NAVY.b);
  doc.rect(0, 0, 297, 22, "F");
  doc.setFillColor(AMBER.r, AMBER.g, AMBER.b);
  doc.rect(0, 22, 297, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("CMG — Painel de Atividades", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(filterLabel, 14, 18);
  doc.setTextColor(30, 30, 30);

  const headers = ["Data", "Atividade", "Tipo", "Área", "Analista", "Situação"];
  const widths = [22, 78, 42, 45, 55, 30];
  let y = 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  headers.forEach((label, index) => {
    const x = 14 + widths.slice(0, index).reduce((a, b) => a + b, 0);
    doc.text(label, x, y);
  });
  y += 4;
  doc.setDrawColor(200, 205, 212);
  doc.line(14, y, 283, y);
  y += 5;
  doc.setFont("helvetica", "normal");

  rows.forEach((row) => {
    if (y > 195) {
      doc.addPage();
      y = 20;
    }
    const cells = [
      formatDate(row.scheduled_date),
      row.title,
      TYPES[row.activity_type],
      AREAS[row.area],
      row.analyst,
      STATUS[row.status],
    ];
    cells.forEach((value, index) => {
      const x = 14 + widths.slice(0, index).reduce((a, b) => a + b, 0);
      doc.text(doc.splitTextToSize(value, widths[index]! - 3)[0] ?? "", x, y);
    });
    y += 7;
  });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Total de atividades: ${rows.length}`, 14, 205);
  doc.save(`cmg-painel-${Date.now()}.pdf`);
}

export function exportActivitiesWord(
  rows: (Activity & { analyst: string })[],
  filterLabel: string,
) {
  const body = rows
    .map(
      (row) => `<tr>
        <td>${formatDate(row.scheduled_date)}</td>
        <td>${escapeHtml(row.title)}</td>
        <td>${TYPES[row.activity_type]}</td>
        <td>${AREAS[row.area]}</td>
        <td>${escapeHtml(row.analyst)}</td>
        <td>${STATUS[row.status]}</td>
      </tr>`,
    )
    .join("");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>CMG — Painel de Atividades</title></head>
    <body style="font-family:Arial,sans-serif;color:#1f2937">
      <div style="background:#1a304a;color:#fff;padding:16px">
        <h1 style="margin:0;font-size:20px">CMG — Central de Monitoramento &amp; Gestão</h1>
        <p style="margin:4px 0 0;font-size:12px">Torre Meridian · Painel de Atividades</p>
      </div>
      <p style="font-size:12px">${escapeHtml(filterLabel)}</p>
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:11px;width:100%">
        <thead style="background:#eef2f7">
          <tr><th>Data</th><th>Atividade</th><th>Tipo</th><th>Área</th><th>Analista</th><th>Situação</th></tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      <p style="font-size:10px;color:#6b7280">Documento gerado em ${new Date().toLocaleString("pt-BR")} · Uso interno</p>
    </body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cmg-painel-${Date.now()}.doc`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>]/g, (char) =>
    char === "&" ? "&amp;" : char === "<" ? "&lt;" : "&gt;",
  );
}
