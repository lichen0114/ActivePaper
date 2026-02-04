export interface PDFOutlineItem {
  title: string
  pageNumber: number | null
  items: PDFOutlineItem[]
}
