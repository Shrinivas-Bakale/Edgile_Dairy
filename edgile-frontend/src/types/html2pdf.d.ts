declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number;
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: string;
    };
  }

  interface Html2PdfInstance {
    set(options: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement | string): Html2PdfInstance;
    save(filename?: string): Html2PdfInstance;
    toContainer(): Promise<Html2PdfInstance>;
    toPdf(): Promise<Html2PdfInstance>;
    toImg(): Promise<Html2PdfInstance>;
    output(type: string, options?: any): Promise<string | Uint8Array | Blob>;
  }

  function html2pdf(): Html2PdfInstance;
  function html2pdf(element: HTMLElement | string, opts?: Html2PdfOptions): Html2PdfInstance;

  export = html2pdf;
} 