import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface PdfFile {
    id: number;
    name: string;
    uploadedBy: string;
    uploadDate: string;
    status: 'Processed' | 'Processing' | 'Failed';
}

const MOCK_PDFS: PdfFile[] = [
    { id: 1, name: 'Chapter 1 - Introduction.pdf', uploadedBy: 'Admin', uploadDate: '2024-10-15', status: 'Processed' },
    { id: 2, name: 'Chapter 2 - Algebra Basics.pdf', uploadedBy: 'Admin', uploadDate: '2024-10-16', status: 'Processed' },
    { id: 3, name: 'Physics - Newton Laws.pdf', uploadedBy: 'Teacher A', uploadDate: '2024-10-18', status: 'Processing' },
    { id: 4, name: 'Biology - Cell Structure.pdf', uploadedBy: 'Admin', uploadDate: '2024-10-20', status: 'Failed' },
    { id: 5, name: 'History - World War II.pdf', uploadedBy: 'Teacher B', uploadDate: '2024-10-22', status: 'Processed' },
];

const QuestionBankDetails: React.FC = () => {
    const { gradeId } = useParams<{ gradeId: string }>();
    const navigate = useNavigate();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [pdfs, setPdfs] = useState<PdfFile[]>(MOCK_PDFS);

    // Mock grade name derivation (in real app, fetch details by ID)
    const gradeName = `Grade ${gradeId}`;

    const handleBack = () => {
        navigate('/school-admin/question-bank');
    };

    const handleAddPdf = () => {
        alert('This would open a file picker to upload a PDF for LLM training.');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={handleBack}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                    title="Go Back"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{gradeName} - Question Bank</h1>
                    <p className="text-slate-500 text-sm">Manage educational materials for this grade.</p>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">Uploaded Materials</h2>
                <button
                    onClick={handleAddPdf}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add PDF to Train LLM
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">File Name</th>
                            <th className="px-6 py-4">Uploaded By</th>
                            <th className="px-6 py-4">Upload Date</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pdfs.map(pdf => (
                            <tr key={pdf.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                    {pdf.name}
                                </td>
                                <td className="px-6 py-4 text-slate-500">{pdf.uploadedBy}</td>
                                <td className="px-6 py-4 text-slate-500">{pdf.uploadDate}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium 
                                        ${pdf.status === 'Processed' ? 'bg-green-100 text-green-700' :
                                            pdf.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-red-100 text-red-700'}`}>
                                        {pdf.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-400 hover:text-red-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pdfs.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        No PDFs uploaded yet. Click "Add PDF to Train LLM" to get started.
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionBankDetails;
