import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Clock, MessageSquare, AlertCircle, Paperclip, Play } from 'lucide-react';

export default function ResidentStatus() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`http://localhost:3001/api/complaints/${id}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Complaint not found.');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="max-w-xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to form
      </Link>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Status Update</h1>
            <p className="text-sm text-slate-500">Complaint ID: <span className="font-mono">{data.id.substring(0,8)}</span></p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            data.issue_status === 'Resolved' ? 'bg-green-100 text-green-700' :
            data.issue_status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {data.issue_status || data.status}
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Issue</h3>
            <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">{data.description}</p>
          </div>
          <div className="flex gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4"/> {data.category}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {new Date(data.created_at).toLocaleDateString()}</span>
          </div>

          {data.attachments && data.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-2">
                <Paperclip className="w-3 h-3"/> Attachments ({data.attachments.length})
              </h4>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {data.attachments.map(att => (
                  <div key={att.id} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 relative">
                    {att.kind === 'video' ? (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white opacity-80" />
                      </div>
                    ) : (
                      <img src={`http://localhost:3001/uploads/${att.file_path}`} className="w-full h-full object-cover" alt="attachment" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" /> Replies from Committee
      </h2>

      {data.replies && data.replies.length > 0 ? (
        <div className="space-y-4">
          {data.replies.map(reply => (
            <div key={reply.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
              <div className="mt-1">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-slate-800 whitespace-pre-wrap">{reply.message}</p>
                <span className="text-xs text-slate-400 mt-2 block">{new Date(reply.sent_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
          <p className="text-slate-500">No replies yet. The committee will respond shortly.</p>
        </div>
      )}
    </div>
  );
}
