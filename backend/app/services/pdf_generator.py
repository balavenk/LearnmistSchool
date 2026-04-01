import os
from io import BytesIO
import reportlab
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, ListFlowable, ListItem
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

class CBSEPaperGenerator:
    def __init__(self, paper_data):
        self.paper = paper_data
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name='CenterHeader',
            parent=self.styles['Heading1'],
            alignment=TA_CENTER,
            fontSize=16,
            spaceAfter=6,
            textColor=colors.black
        ))
        self.styles.add(ParagraphStyle(
            name='SubHeader',
            parent=self.styles['Normal'],
            alignment=TA_CENTER,
            fontSize=12,
            spaceAfter=12,
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            alignment=TA_CENTER,
            fontSize=14,
            spaceBefore=12,
            spaceAfter=12,
        ))
        self.styles.add(ParagraphStyle(
            name='Instruction',
            parent=self.styles['Normal'],
            fontSize=10,
            leading=14,
            leftIndent=20,
        ))
        self.styles.add(ParagraphStyle(
            name='QuestionText',
            parent=self.styles['Normal'],
            fontSize=11,
            leading=16,
            spaceBefore=6,
        ))
        self.styles.add(ParagraphStyle(
            name='QuestionOption',
            parent=self.styles['Normal'],
            fontSize=11,
            leftIndent=20,
            leading=14,
        ))

    def generate_pdf(self):
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        story = []
        
        # 1. Header Section
        school_name = self.paper.get('school_name', 'SAMPLE SCHOOL')
        story.append(Paragraph(school_name.upper(), self.styles['CenterHeader']))
        
        exam_title = f"{self.paper.get('exam_type', 'Terminal Examination')} - {self.paper.get('academic_year', '2025-26')}"
        story.append(Paragraph(exam_title, self.styles['SubHeader']))
        
        subject_title = f"Class: {self.paper.get('grade', '')} | Subject: {self.paper.get('subject', '')}"
        story.append(Paragraph(subject_title, self.styles['SubHeader']))
        
        # Meta Info Table (Time, Marks, Set)
        meta_data = [
            [
                f"Time Allowed: {self.paper.get('duration', 180)} Minutes", 
                f"Set: {self.paper.get('set_number', '1')}", 
                f"Maximum Marks: {self.paper.get('total_marks', 80)}"
            ]
        ]
        meta_table = Table(meta_data, colWidths=[2.5*inch, 1.5*inch, 2.5*inch])
        meta_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))
        
        # 2. General Instructions
        instructions = self.paper.get('general_instructions', [])
        if instructions:
            story.append(Paragraph("General Instructions:", self.styles['Heading3']))
            for inst in instructions:
                story.append(Paragraph(f"• {inst}", self.styles['Instruction']))
            story.append(Spacer(1, 15))
            
        # 3. Sections and Questions
        q_num = 1
        for section in self.paper.get('sections', []):
            sec_name = section.get('name', 'Section')
            story.append(Paragraph(f"SECTION - {sec_name.upper()}", self.styles['SectionHeader']))
            
            for q in section.get('questions', []):
                # Question Table: [Q.No | Text | Marks]
                q_text = Paragraph(q.get('text', ''), self.styles['QuestionText'])
                points = f"[{q.get('points', 1)}]"
                
                # If there's an image
                media = None
                if q.get('media_url'):
                    # Load image logic would go here, placeholder for now
                    pass
                
                q_data = [
                    [f"{q_num}.", q_text, points]
                ]
                q_table = Table(q_data, colWidths=[0.3*inch, 6*inch, 0.5*inch])
                q_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
                    ('RIGHTPADDING', (2, 0), (2, 0), 0),
                ]))
                story.append(q_table)
                
                # Options for MCQ
                options = q.get('options', [])
                if options:
                    opt_labels = ['(a)', '(b)', '(c)', '(d)']
                    for idx, opt in enumerate(options):
                        lbl = opt_labels[idx] if idx < len(opt_labels) else f"({idx+1})"
                        opt_text = Paragraph(f"{lbl} {opt.get('text', '')}", self.styles['QuestionOption'])
                        story.append(opt_text)
                        
                story.append(Spacer(1, 10))
                q_num += 1

        doc.build(story)
        pdf_value = buffer.getvalue()
        buffer.close()
        
        return pdf_value
