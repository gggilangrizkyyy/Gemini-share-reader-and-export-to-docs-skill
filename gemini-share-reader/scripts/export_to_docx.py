"""
export_to_docx.py

Converts extracted Gemini chat sessions, Q&A banks, or study guides into a
professionally formatted .docx file compatible with Google Docs and Microsoft Word.

Usage:
  python export_to_docx.py --input <extracted_text_or_json> --output <output.docx> [--title <title>]
"""

import sys
import os
import argparse
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_styled_document(input_file, output_file, doc_title=None):
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    doc = docx.Document()

    # Set 1-inch margins
    for s in doc.sections:
        s.top_margin = Inches(1)
        s.bottom_margin = Inches(1)
        s.left_margin = Inches(1)
        s.right_margin = Inches(1)

    PRIMARY_COLOR = RGBColor(31, 78, 121)    # Deep Navy
    SECONDARY_COLOR = RGBColor(46, 117, 182) # Accent Blue
    DARK_GRAY = RGBColor(51, 51, 51)
    MUTED_GRAY = RGBColor(119, 119, 119)

    # Document Header
    title_p = doc.add_paragraph()
    title_text = doc_title or "Exported Gemini Chat Session"
    t_run = title_p.add_run(title_text)
    t_run.font.name = 'Calibri'
    t_run.font.size = Pt(22)
    t_run.font.bold = True
    t_run.font.color.rgb = PRIMARY_COLOR
    title_p.paragraph_format.space_after = Pt(4)

    sub_p = doc.add_paragraph()
    s_run = sub_p.add_run(f"Source: {os.path.basename(input_file)}")
    s_run.font.name = 'Calibri'
    s_run.font.size = Pt(11)
    s_run.font.italic = True
    s_run.font.color.rgb = MUTED_GRAY
    sub_p.paragraph_format.space_after = Pt(16)

    # Process paragraphs
    lines = content.split('\n')
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        
        # Check headings
        if stripped.startswith('# '):
            h = doc.add_heading(level=1)
            r = h.add_run(stripped[2:])
            r.font.name = 'Calibri'
            r.font.size = Pt(16)
            r.font.bold = True
            r.font.color.rgb = PRIMARY_COLOR
            h.paragraph_format.space_before = Pt(14)
            h.paragraph_format.space_after = Pt(6)
        elif stripped.startswith('## '):
            h = doc.add_heading(level=2)
            r = h.add_run(stripped[3:])
            r.font.name = 'Calibri'
            r.font.size = Pt(13)
            r.font.bold = True
            r.font.color.rgb = SECONDARY_COLOR
            h.paragraph_format.space_before = Pt(10)
            h.paragraph_format.space_after = Pt(4)
        elif stripped.startswith('### '):
            h = doc.add_heading(level=3)
            r = h.add_run(stripped[4:])
            r.font.name = 'Calibri'
            r.font.size = Pt(11.5)
            r.font.bold = True
            r.font.color.rgb = PRIMARY_COLOR
            h.paragraph_format.space_before = Pt(8)
            h.paragraph_format.space_after = Pt(2)
        elif stripped.startswith('• ') or stripped.startswith('* ') or stripped.startswith('- '):
            p = doc.add_paragraph(style='List Bullet')
            r = p.add_run(stripped[2:])
            r.font.name = 'Calibri'
            r.font.size = Pt(10)
            r.font.color.rgb = DARK_GRAY
            p.paragraph_format.space_after = Pt(3)
        else:
            p = doc.add_paragraph()
            r = p.add_run(stripped)
            r.font.name = 'Calibri'
            r.font.size = Pt(10.5)
            r.font.color.rgb = DARK_GRAY
            p.paragraph_format.space_after = Pt(6)

    doc.save(output_file)
    print(f"Successfully generated Word/Google Docs file: {output_file}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Export text to styled .docx")
    parser.add_argument('--input', '-i', required=True, help="Input text or json file")
    parser.add_argument('--output', '-o', required=True, help="Output .docx file")
    parser.add_argument('--title', '-t', default=None, help="Title of document")
    args = parser.parse_args()

    create_styled_document(args.input, args.output, args.title)
