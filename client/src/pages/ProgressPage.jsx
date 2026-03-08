import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Plus, ChevronRight, TrendingUp, History, Image as ImageIcon } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const ProgressPage = () => {
    const [trackingData, setTrackingData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadData, setUploadData] = useState({ severity: 'mild', notes: '', image: null });
    const [previewUrl, setPreviewUrl] = useState(null);

    // Mock User ID for demo
    const userId = '12345678-1234-1234-1234-123456789012';

    useEffect(() => {
        fetchProgress();
    }, []);

    const fetchProgress = async () => {
        try {
            const resp = await axios.get('http://localhost:5000/api/progress', {
                headers: { 'x-user-id': userId }
            });
            setTrackingData(resp.data);
        } catch (err) {
            console.error('Fetch progress error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadData({ ...uploadData, image: file });
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.image) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('severity', uploadData.severity);
        formData.append('notes', uploadData.notes);
        formData.append('image', uploadData.image);

        try {
            await axios.post('http://localhost:5000/api/progress', formData);
            setUploadData({ severity: 'mild', notes: '', image: null });
            setPreviewUrl(null);
            fetchProgress();
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const chartData = {
        labels: trackingData.map(d => new Date(d.created_at).toLocaleDateString()),
        datasets: [
            {
                label: 'Condition Severity',
                data: trackingData.map(d => {
                    if (d.severity === 'severe') return 3;
                    if (d.severity === 'moderate') return 2;
                    return 1;
                }),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.3,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: {
                min: 0,
                max: 4,
                ticks: {
                    callback: (value) => {
                        if (value === 1) return 'Mild';
                        if (value === 2) return 'Moderate';
                        if (value === 3) return 'Severe';
                        return '';
                    }
                }
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <TrendingUp className="text-blue-600" />
                        Disease Progress Tracking
                    </h1>
                    <p className="text-gray-500 mt-2">Monitor your skin condition improvement over time.</p>
                </div>

                <button
                    onClick={() => document.getElementById('upload-modal').showModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                    <Plus className="w-5 h-5" />
                    New Log
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Improvement Graph */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <TrendingUp className="text-blue-500 w-5 h-5" />
                        Improvement Over Time
                    </h2>
                    {trackingData.length > 1 ? (
                        <div className="h-[400px]">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    ) : (
                        <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                            <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                            <p>Upload at least two logs to see your progress graph.</p>
                        </div>
                    )}
                </div>

                {/* Recent History */}
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <History className="text-gray-500 w-5 h-5" />
                        Comparison Journal
                    </h2>
                    <div className="space-y-4">
                        {trackingData.slice().reverse().map((log, idx) => (
                            <div key={log.id} className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-blue-50/50 transition-colors group">
                                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                    {log.image_url ? (
                                        <img
                                            src={`http://localhost:5000${log.image_url}`}
                                            alt="Log"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                            <ImageIcon className="text-gray-400 w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                            {idx === 0 ? 'Latest' : `Day ${trackingData.length - idx}`}
                                        </p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${log.severity === 'severe' ? 'bg-red-100 text-red-600' :
                                                log.severity === 'moderate' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-green-100 text-green-600'
                                            }`}>
                                            {log.severity}
                                        </span>
                                    </div>
                                    <p className="font-bold text-gray-800 mt-1">{new Date(log.created_at).toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1 italic">"{log.notes || 'No notes added'}"</p>
                                </div>
                            </div>
                        ))}
                        {trackingData.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                <p>No logs found. Start tracking today!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            <dialog id="upload-modal" className="modal bg-gray-900/50 backdrop-blur-sm">
                <div className="modal-box bg-white rounded-2xl max-w-lg p-0 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="font-bold text-xl">Log Daily Progress</h3>
                        <p className="text-sm text-gray-500">Capture or upload an image to track changes.</p>
                    </div>

                    <form onSubmit={handleUpload} className="p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Current Appearance</label>
                            <div
                                onClick={() => document.getElementById('log-image').click()}
                                className={`relative h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${previewUrl ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
                                    }`}
                            >
                                {previewUrl ? (
                                    <img src={previewUrl} className="h-full w-full object-contain rounded-lg p-2" alt="Preview" />
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                                            <Camera className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm text-gray-500 font-medium">Click to upload photo</span>
                                    </>
                                )}
                                <input id="log-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Severity Level</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 appearance-none"
                                    value={uploadData.severity}
                                    onChange={e => setUploadData({ ...uploadData, severity: e.target.value })}
                                >
                                    <option value="mild">Mild</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="severe">Severe</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Notes (Optional)</label>
                            <textarea
                                className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                                placeholder="How does it feel today? (Itchy, dry, etc.)"
                                value={uploadData.notes}
                                onChange={e => setUploadData({ ...uploadData, notes: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => document.getElementById('upload-modal').close()}
                                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUploading || !uploadData.image}
                                className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all ${isUploading || !uploadData.image
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                    }`}
                            >
                                {isUploading ? 'Uploading...' : 'Save Log'}
                            </button>
                        </div>
                    </form>
                </div>
            </dialog>
        </div>
    );
};

export default ProgressPage;
