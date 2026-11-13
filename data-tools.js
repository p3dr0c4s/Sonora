(function (global) {
  "use strict";

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function exportJson(filename, data) {
    downloadFile(
      filename,
      `${JSON.stringify(data, null, 2)}\n`,
      "application/json;charset=utf-8"
    );
  }

  function escapeCsvCell(value) {
    let text = value == null ? "" : String(value);

    if (/^\s*[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportSessionsCsv(filename, sessions) {
    const columns = [
      ["Data", session => session.date || ""],
      ["Duração (segundos)", session => Number(session.duration) || 0],
      ["Tipo", session => session.mode === "planned" ? "Planejada" : "Livre"],
      ["Instrumento", session => session.instrumentName || ""],
      ["Objetivo", session => session.objective || ""],
      ["Conteúdo", session => session.content || ""],
      ["Dificuldades", session => session.difficulty || ""],
      ["Anotações", session => session.notes || ""]
    ];

    const rows = [
      columns.map(([heading]) => escapeCsvCell(heading)).join(","),
      ...sessions.map(session =>
        columns.map(([, getValue]) => escapeCsvCell(getValue(session))).join(",")
      )
    ];

    downloadFile(filename, `\uFEFF${rows.join("\r\n")}\r\n`, "text/csv;charset=utf-8");
  }

  function readJsonFile(file) {
    if (!file) {
      return Promise.reject(new Error("Selecione um arquivo JSON."));
    }

    if (file.size > 50 * 1024 * 1024) {
      return Promise.reject(new Error("O backup deve ter no máximo 50 MB."));
    }

    return file.text().then(text => {
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new Error("O arquivo selecionado não contém um JSON válido.");
      }
    });
  }

  global.SONORA_DATA_TOOLS = Object.freeze({
    exportJson,
    exportSessionsCsv,
    readJsonFile
  });
})(window);
