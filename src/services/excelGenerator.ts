import { zipSync, strToU8 } from "fflate";
import { Transaction, Profile, DebtItem } from "../types";
import { getMonthName, roundCurrency } from "../utils";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function colToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export interface ExcelSheetData {
  name: string;
  rows: (string | number | boolean | null | undefined)[][];
}

/**
 * Generuje czysty, standardowy plik XLSX (OpenXML / ISO 29500) w pamięci bez zewnętrznych ociężałych bibliotek.
 * Używa szybkiego zippera fflate.
 */
export function buildXlsxArchive(sheets: ExcelSheetData[]): Uint8Array {
  if (sheets.length === 0) {
    sheets = [{ name: "Arkusz1", rows: [["Brak danych"]] }];
  }

  // 1. [Content_Types].xml
  const sheetOverrides = sheets
    .map(
      (_, idx) =>
        `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("\n  ");

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;

  // 2. _rels/.rels
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // 3. xl/_rels/workbook.xml.rels
  const sheetRels = sheets
    .map(
      (_, idx) =>
        `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`
    )
    .join("\n  ");
  const stylesRelId = `rId${sheets.length + 1}`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // 4. xl/workbook.xml
  const sheetList = sheets
    .map((s, idx) => {
      const sanitizedName = escapeXml(s.name.replace(/[/\\?*[\]:]/g, "_").slice(0, 31) || `Arkusz${idx + 1}`);
      return `<sheet name="${sanitizedName}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`;
    })
    .join("\n    ");

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheetList}
  </sheets>
</workbook>`;

  // 5. xl/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><name val="Segoe UI"/><sz val="11"/><color rgb="FF181A1D"/></font>
    <font><b/><name val="Segoe UI"/><sz val="11"/><color rgb="FF111827"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFE5E7EB"/></left>
      <right style="thin"><color rgb="FFE5E7EB"/></right>
      <top style="thin"><color rgb="FFE5E7EB"/></top>
      <bottom style="thin"><color rgb="FFE5E7EB"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="2" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

  // 6. Pliki do spakowania
  const zipFiles: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypesXml),
    "_rels/.rels": strToU8(rootRelsXml),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRelsXml),
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/styles.xml": strToU8(stylesXml)
  };

  // 7. Generowanie każdego arkusza
  sheets.forEach((sheet, sheetIdx) => {
    let sheetDataXml = "";
    sheet.rows.forEach((row, rowIdx) => {
      const rowNum = rowIdx + 1;
      const isHeader = rowIdx === 0;
      let rowCellsXml = "";

      row.forEach((cellVal, colIdx) => {
        const cellRef = `${colToLetter(colIdx)}${rowNum}`;

        if (cellVal === null || cellVal === undefined || cellVal === "") {
          rowCellsXml += `<c r="${cellRef}" s="${isHeader ? "1" : "0"}"/>`;
        } else if (typeof cellVal === "number" && !isNaN(cellVal) && isFinite(cellVal)) {
          const styleId = isHeader ? "1" : "2"; // 2 = format liczbowy
          rowCellsXml += `<c r="${cellRef}" s="${styleId}"><v>${cellVal}</v></c>`;
        } else {
          const styleId = isHeader ? "1" : "0";
          rowCellsXml += `<c r="${cellRef}" s="${styleId}" t="inlineStr"><is><t>${escapeXml(String(cellVal))}</t></is></c>`;
        }
      });

      sheetDataXml += `<row r="${rowNum}">${rowCellsXml}</row>`;
    });

    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${sheetDataXml}
  </sheetData>
</worksheet>`;

    zipFiles[`xl/worksheets/sheet${sheetIdx + 1}.xml`] = strToU8(worksheetXml);
  });

  return zipSync(zipFiles);
}

/**
 * Eksport transakcji do formatu Excel (.xlsx)
 */
export function generateTransactionsExcelBlob(
  transactions: Transaction[],
  currency: string = "PLN"
): Blob {
  const headers = [
    "Data",
    "Tytuł operacji",
    "Kategoria",
    "Konto",
    "Typ",
    "Kwota",
    "Waluta",
    "Tagi"
  ];

  const rows: (string | number)[][] = [headers];

  transactions.forEach((tx) => {
    const isExpense = tx.type === "expense";
    const amountVal = roundCurrency(Number(tx.amount) || 0) * (isExpense ? -1 : 1);
    rows.push([
      tx.isoDate || "",
      tx.name || "",
      tx.category || "Inne",
      tx.account || "",
      isExpense ? "Wydatek" : "Przychód",
      amountVal,
      tx.currency || currency,
      Array.isArray(tx.tags) ? tx.tags.join(", ") : ""
    ]);
  });

  const zipBytes = buildXlsxArchive([
    {
      name: "Transakcje",
      rows
    }
  ]);

  return new Blob([zipBytes as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

/**
 * Eksport budżetu do formatu Excel (.xlsx)
 */
export function generateBudgetExcelBlob(
  profile: Profile,
  year: number,
  month: number
): Blob {
  const monthName = getMonthName(month);
  const currency = profile.currency || "PLN";

  // Obliczenie sum wydatków per kategoria w wybranym miesiącu
  const spentByCategory: Record<string, number> = {};
  (profile.transactions || []).forEach((t) => {
    if (t.type === "expense" && t.isoDate) {
      const d = new Date(`${t.isoDate}T12:00:00`);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const cat = t.category || "Inne";
        spentByCategory[cat] = (spentByCategory[cat] || 0) + (Number(t.amount) || 0);
      }
    }
  });

  const headers = [
    "Kategoria",
    "Grupa 50/30/20",
    `Limit budżetowy (${currency})`,
    `Wydano (${currency})`,
    `Różnica / Oszczędność (${currency})`,
    "Realizacja limitu (%)"
  ];

  const rows: (string | number)[][] = [headers];

  const categories = Object.keys(profile.budgets || {});
  // Dodaj również kategorie, które miały wydatki, a nie mają zdefiniowanego limitu
  Object.keys(spentByCategory).forEach((cat) => {
    if (!categories.includes(cat)) {
      categories.push(cat);
    }
  });

  categories.sort().forEach((cat) => {
    const limit = Number(profile.budgets?.[cat]) || 0;
    const spent = roundCurrency(spentByCategory[cat] || 0);
    const diff = roundCurrency(limit - spent);
    const pct = limit > 0 ? roundCurrency((spent / limit) * 100) : 0;
    const group503020 = (profile as any).categoryGroups?.[cat] || "Potrzeby";

    rows.push([
      cat,
      group503020,
      limit,
      spent,
      diff,
      `${pct}%`
    ]);
  });

  const zipBytes = buildXlsxArchive([
    {
      name: `Budżet ${monthName} ${year}`,
      rows
    }
  ]);

  return new Blob([zipBytes as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

/**
 * Eksport portfela kredytów do formatu Excel (.xlsx)
 */
export function generateDebtsExcelBlob(
  debts: DebtItem[],
  currency: string = "PLN"
): Blob {
  const headers = [
    "Nazwa zobowiązania",
    "Instytucja",
    "Typ",
    `Początkowa kwota (${currency})`,
    `Aktualne saldo (${currency})`,
    "Oprocentowanie (%)",
    `Rata miesięczna (${currency})`,
    "Pozostało rat (m-cy)",
    "Status"
  ];

  const rows: (string | number)[][] = [headers];

  const debtTypeMap: Record<string, string> = {
    mortgage: "Kredyt hipoteczny",
    cash_loan: "Kredyt gotówkowy",
    car_loan: "Kredyt samochodowy",
    credit_card: "Karta kredytowa",
    limit: "Limit w koncie",
    peer_to_peer: "Pożyczka prywatna",
    other: "Inne zobowiązanie"
  };

  debts.forEach((debt) => {
    rows.push([
      debt.name || "",
      debt.institution || "",
      debtTypeMap[debt.type] || debt.type || "Inne",
      roundCurrency(debt.originalAmount || 0),
      roundCurrency(debt.balance || 0),
      Number(debt.interestRate || 0),
      roundCurrency(debt.monthlyPayment || 0),
      Number(debt.remainingMonths || 0),
      debt.status === "closed" ? "Spłacone" : "Aktywne"
    ]);
  });

  const zipBytes = buildXlsxArchive([
    {
      name: "Zobowiązania kredytowe",
      rows
    }
  ]);

  return new Blob([zipBytes as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}
