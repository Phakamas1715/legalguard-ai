import legalguardSealUrl from "@/assets/logos/legalguard-logo.png";

export interface WordExportSection {
  heading: string;
  body?: string;
  bullets?: string[];
}

export interface WordExportMetaRow {
  label: string;
  value: string;
}

export interface WordExportHeader {
  sealText?: string;
  organization?: string;
  suborganization?: string;
  documentClass?: string;
}

export interface WordExportSignatory {
  nameLine: string;
  titleLine: string;
  note?: string;
}

const encoder = new TextEncoder();
const getThaiBuddhistYear = () => new Date().getFullYear() + 543;
const LOGO_WIDTH_EMU = 1_371_600;
const LOGO_HEIGHT_EMU = 685_800;

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const concatBytes = (...chunks: Uint8Array[]) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
};

const uint16 = (value: number) => {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
};

const uint32 = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
};

const buildParagraph = (
  text: string,
  options?: { bold?: boolean; sizeHalfPoints?: number; spacingAfter?: number; align?: "left" | "center" | "right" },
) => {
  const props = [];
  if (options?.bold || options?.sizeHalfPoints || options?.spacingAfter !== undefined) {
    const runProps = [];
    if (options.bold) runProps.push("<w:b/>");
    if (options.sizeHalfPoints) runProps.push(`<w:sz w:val="${options.sizeHalfPoints}"/>`);
    const paragraphOptions = [];
    if (options.spacingAfter !== undefined) {
      paragraphOptions.push(`<w:spacing w:after="${options.spacingAfter}"/>`);
    }
    if (options.align) {
      paragraphOptions.push(`<w:jc w:val="${options.align}"/>`);
    }
    const paragraphProps = paragraphOptions.length
      ? `<w:pPr>${paragraphOptions.join("")}</w:pPr>`
      : "";
    props.push(paragraphProps);
    props.push(`<w:r><w:rPr>${runProps.join("")}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`);
    return `<w:p>${props.join("")}</w:p>`;
  }
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
};

const buildDocumentXml = (
  title: string,
  subtitle: string | undefined,
  sections: WordExportSection[],
  metaRows: WordExportMetaRow[] = [],
  signatories: WordExportSignatory[] = [],
  header?: WordExportHeader,
  includeSealImage = false,
) => {
  const bodyParts = [
    ...(includeSealImage
      ? [`
        <w:p>
          <w:pPr><w:jc w:val="center"/></w:pPr>
          <w:r>
            <w:drawing>
              <wp:inline distT="0" distB="0" distL="0" distR="0">
                <wp:extent cx="${LOGO_WIDTH_EMU}" cy="${LOGO_HEIGHT_EMU}"/>
                <wp:docPr id="1" name="LegalGuardSeal"/>
                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                  <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:nvPicPr>
                        <pic:cNvPr id="0" name="LegalGuardSeal"/>
                        <pic:cNvPicPr/>
                      </pic:nvPicPr>
                      <pic:blipFill>
                        <a:blip r:embed="rIdImage1"/>
                        <a:stretch><a:fillRect/></a:stretch>
                      </pic:blipFill>
                      <pic:spPr>
                        <a:xfrm>
                          <a:off x="0" y="0"/>
                          <a:ext cx="${LOGO_WIDTH_EMU}" cy="${LOGO_HEIGHT_EMU}"/>
                        </a:xfrm>
                        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                      </pic:spPr>
                    </pic:pic>
                  </a:graphicData>
                </a:graphic>
              </wp:inline>
            </w:drawing>
          </w:r>
        </w:p>
      `]
      : []),
    buildParagraph(header?.sealText ?? "ตราหน่วยงาน", { bold: true, sizeHalfPoints: 22, spacingAfter: 30, align: "center" }),
    buildParagraph(header?.organization ?? "LegalGuard AI", { bold: true, sizeHalfPoints: 30, spacingAfter: 30, align: "center" }),
    buildParagraph(header?.suborganization ?? "เอกสารประกอบการปฏิบัติงานในรูปแบบทางการ", { sizeHalfPoints: 20, spacingAfter: 30, align: "center" }),
    ...(header?.documentClass
      ? [buildParagraph(header.documentClass, { bold: true, sizeHalfPoints: 18, spacingAfter: 120, align: "center" })]
      : [buildParagraph(" ", { spacingAfter: 120 })]),
    buildParagraph(title, { bold: true, sizeHalfPoints: 32, spacingAfter: 160, align: "center" }),
  ];

  if (subtitle) {
    bodyParts.push(buildParagraph(subtitle, { spacingAfter: 180, align: "center" }));
  }

  if (metaRows.length > 0) {
    metaRows.forEach((row) => {
      bodyParts.push(buildParagraph(`${row.label} ${row.value}`, { spacingAfter: 30 }));
    });
    bodyParts.push(buildParagraph(" ", { spacingAfter: 80 }));
  }

  sections.forEach((section) => {
    bodyParts.push(buildParagraph(section.heading, { bold: true, sizeHalfPoints: 28, spacingAfter: 120 }));
    if (section.body) {
      section.body.split("\n").forEach((line) => {
        bodyParts.push(buildParagraph(line || " ", { spacingAfter: 60 }));
      });
    }
    section.bullets?.forEach((item) => {
      bodyParts.push(buildParagraph(`• ${item}`, { spacingAfter: 40 }));
    });
  });

  if (signatories.length > 0) {
    bodyParts.push(buildParagraph(" ", { spacingAfter: 180 }));
    signatories.forEach((signatory) => {
      bodyParts.push(buildParagraph("ลงชื่อ ____________________", { spacingAfter: 20, align: "right" }));
      bodyParts.push(buildParagraph(signatory.nameLine, { spacingAfter: 20, align: "right" }));
      bodyParts.push(buildParagraph(signatory.titleLine, { spacingAfter: 20, align: "right" }));
      if (signatory.note) {
        bodyParts.push(buildParagraph(signatory.note, { spacingAfter: 80, align: "right" }));
      }
    });
  }

  bodyParts.push(buildParagraph(`จัดทำโดย LegalGuard AI เมื่อ ${new Date().toLocaleString("th-TH")}`, { spacingAfter: 0 }));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    ${bodyParts.join("")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
};

const buildZip = (files: Array<{ path: string; content: string | Uint8Array }>) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.path);
    const dataBytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const checksum = crc32(dataBytes);

    const localHeader = concatBytes(
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(dataBytes.length),
      uint32(dataBytes.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes,
      dataBytes,
    );

    const centralHeader = concatBytes(
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(checksum),
      uint32(dataBytes.length),
      uint32(dataBytes.length),
      uint16(nameBytes.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      nameBytes,
    );

    localParts.push(localHeader);
    centralParts.push(centralHeader);
    offset += localHeader.length;
  });

  const centralDirectory = concatBytes(...centralParts);
  const localDirectory = concatBytes(...localParts);
  const endRecord = concatBytes(
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(localDirectory.length),
    uint16(0),
  );

  return concatBytes(localDirectory, centralDirectory, endRecord);
};

export const downloadWordDocument = ({
  fileName,
  title,
  subtitle,
  sections,
  metaRows,
  signatories,
  header,
}: {
  fileName: string;
  title: string;
  subtitle?: string;
  sections: WordExportSection[];
  metaRows?: WordExportMetaRow[];
  signatories?: WordExportSignatory[];
  header?: WordExportHeader;
}) => {
  const withSealImage = true;
  const documentXml = buildDocumentXml(title, subtitle, sections, metaRows, signatories, header, withSealImage);
  const sealBytesPromise = fetch(legalguardSealUrl)
    .then((response) => response.arrayBuffer())
    .then((buffer) => new Uint8Array(buffer));
  return sealBytesPromise.then((sealBytes) => {
    const files = [
    {
      path: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      path: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      path: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>LegalGuard AI</dc:creator>
  <cp:lastModifiedBy>LegalGuard AI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`,
    },
    {
      path: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>LegalGuard AI</Application>
</Properties>`,
    },
    {
      path: "word/document.xml",
      content: documentXml,
    },
    {
      path: "word/_rels/document.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/legalguard-logo.png"/>
</Relationships>`,
    },
    {
      path: "word/media/legalguard-logo.png",
      content: sealBytes,
    },
    ];

    const zipBytes = buildZip(files);
    const blob = new Blob([zipBytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
    anchor.click();
    URL.revokeObjectURL(url);
  });
};

export const createFormalDocumentNumber = (prefix: string) =>
  `${prefix}/${getThaiBuddhistYear()}-${String(Date.now()).slice(-6)}`;
