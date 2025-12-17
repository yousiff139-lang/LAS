import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Edit, Trash2, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { lectureApi, Lecture } from '../services/api';
import './Pages.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Lectures() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
    const [formData, setFormData] = useState({
        course_name: '',
        lecturer_name: '',
        day_of_week: 0,
        start_time: '',
        end_time: '',
        location: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['lectures'],
        queryFn: () => lectureApi.getAll({ limit: 100 }),
    });

    const createMutation = useMutation({
        mutationFn: lectureApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            toast.success('Lecture created successfully');
            closeModal();
        },
        onError: () => toast.error('Failed to create lecture'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Lecture> }) => lectureApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            toast.success('Lecture updated successfully');
            closeModal();
        },
        onError: () => toast.error('Failed to update lecture'),
    });

    const deleteMutation = useMutation({
        mutationFn: lectureApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            toast.success('Lecture deleted successfully');
        },
        onError: () => toast.error('Failed to delete lecture'),
    });

    const importMutation = useMutation({
        mutationFn: lectureApi.import,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['lectures'] });
            toast.success(data.message || 'Lectures imported successfully');
        },
        onError: () => toast.error('Failed to import lectures'),
    });

    const openModal = (lecture?: Lecture) => {
        if (lecture) {
            setEditingLecture(lecture);
            setFormData({
                course_name: lecture.course_name,
                lecturer_name: lecture.lecturer_name || '',
                day_of_week: lecture.day_of_week ?? 0,
                start_time: lecture.start_time.slice(0, 5),
                end_time: lecture.end_time.slice(0, 5),
                location: lecture.location || '',
            });
        } else {
            setEditingLecture(null);
            setFormData({
                course_name: '',
                lecturer_name: '',
                day_of_week: 0,
                start_time: '',
                end_time: '',
                location: '',
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingLecture(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLecture) {
            updateMutation.mutate({ id: editingLecture.lecture_id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this lecture?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            importMutation.mutate(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1>Lectures</h1>
                    <p>Manage lecture schedules and import from Excel</p>
                </div>
                <div className="header-actions">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <button
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importMutation.isPending}
                    >
                        <Upload size={18} />
                        {importMutation.isPending ? 'Importing...' : 'Import Excel'}
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        Add Lecture
                    </button>
                </div>
            </header>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Course Name</th>
                            <th>Lecturer</th>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Location</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="loading-cell">
                                    <div className="spinner"></div>
                                </td>
                            </tr>
                        ) : data?.lectures?.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="empty-cell">No lectures found</td>
                            </tr>
                        ) : (
                            data?.lectures?.map((lecture) => (
                                <tr key={lecture.lecture_id}>
                                    <td>{lecture.course_name}</td>
                                    <td>{lecture.lecturer_name || '-'}</td>
                                    <td>
                                        <span className="badge badge-info">
                                            {lecture.day_of_week !== undefined ? DAYS[lecture.day_of_week] : 'N/A'}
                                        </span>
                                    </td>
                                    <td>
                                        {lecture.start_time.slice(0, 5)} - {lecture.end_time.slice(0, 5)}
                                    </td>
                                    <td>{lecture.location || '-'}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => openModal(lecture)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(lecture.lecture_id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingLecture ? 'Edit Lecture' : 'Add Lecture'}</h2>
                            <button className="btn-icon" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="label">Course Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.course_name}
                                    onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Lecturer Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.lecturer_name}
                                    onChange={(e) => setFormData({ ...formData, lecturer_name: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Day of Week</label>
                                    <select
                                        className="input"
                                        value={formData.day_of_week}
                                        onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                                    >
                                        {DAYS.map((day, index) => (
                                            <option key={day} value={index}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="label">Location</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Start Time *</label>
                                    <input
                                        type="time"
                                        className="input"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">End Time *</label>
                                    <input
                                        type="time"
                                        className="input"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingLecture ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Lectures;
