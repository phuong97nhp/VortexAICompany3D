import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, FileText } from 'lucide-react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { DocumentItem } from '../../types';

export function DocsPanel() {
  const agents = useCompanyStore((s) => s.agents);
  const documents = useCompanyStore((s) => s.documents);
  const [category, setCategory] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(documents[0] || null);

  const filtered = documents.filter((d) => category === 'all' || d.category === category);

  const downloadDoc = (doc: DocumentItem) => {
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-xs rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1.5"
        >
          <option value="all">Tất cả tài liệu ({documents.length})</option>
          <option value="strategy">Chiến lược</option>
          <option value="research">Nghiên cứu thị trường</option>
          <option value="content">Content Marketing</option>
          <option value="seo">SEO</option>
          <option value="quote">Báo giá</option>
          <option value="contract">Hợp đồng nháp</option>
          <option value="meeting_minutes">Biên bản họp</option>
          <option value="faq">FAQ CSKH</option>
        </select>

        {selectedDoc && (
          <button
            type="button"
            onClick={() => downloadDoc(selectedDoc)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải .md</span>
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 overflow-hidden">
        <div className="md:col-span-2 overflow-y-auto space-y-1.5 pr-1">
          {filtered.map((doc) => {
            const author = agents.find((a) => a.id === doc.authorId);
            const isSel = selectedDoc?.id === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  isSel
                    ? 'bg-sky-600/15 border-sky-500/50'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {author?.name || doc.authorId} · {doc.category} ·{' '}
                  {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </button>
            );
          })}
        </div>

        <div className="md:col-span-3 overflow-y-auto rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
          {selectedDoc ? (
            <div className="markdown-body text-xs leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedDoc.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-400">Chọn một tài liệu để xem trước.</div>
          )}
        </div>
      </div>
    </div>
  );
}
