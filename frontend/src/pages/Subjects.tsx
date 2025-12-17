import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Clock, MapPin, GraduationCap } from 'lucide-react';
import { subjectApi, Subject } from '../services/api';
import './Pages.css';

const ACADEMIC_STAGES = [
    { value: 'stage_1', label: 'Stage 1' },
    { value: 'stage_2', label: 'Stage 2' },
    { value: 'stage_3', label: 'Stage 3' },
    { value: 'stage_4', label: 'Stage 4' },
    { value: 'stage_5', label: 'Stage 5' },
    { value: 'postgraduate', label: 'Postgraduate' },
];

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

function Subjects() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [filterStage, setFilterStage] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [formData, setFormData] = useState({
        subject_code: '',
        subject_name: '',
        day_of_week: '',
        specific_date: '',
        start_time: '',
        end_time: '',
        academic_stage: 'stage_1',
        status: 'active',
        location: '',
        instructor_name: '',
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['subjects', filterStage, filterStatus],
        queryFn: () => subjectApi.getAll({
            academic_stage: filterStage || undefined,
            status: filterStatus || undefined,
        }),
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Subject>) => subjectApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            closeModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Subject> }) => subjectApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            closeModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => subjectApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
    });

    const toggleMutation = useMutation({
        mutationFn: (id: string) => subjectApi.toggleStatus(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
    });

    const openModal = (subject?: Subject) => {
        if (subject) {
            setEditingSubject(subject);
            setFormData({
                subject_code: subject.subject_code,
                subject_name: subject.subject_name,
                day_of_week: subject.day_of_week?.toString() || '',
                specific_date: subject.specific_date?.split('T')[0] || '',
                start_time: subject.start_time,
                end_time: subject.end_time,
                academic_stage: subject.academic_stage,
                status: subject.status,
                location: subject.location || '',
                instructor_name: subject.instructor_name || '',
            });
        } else {
            setEditingSubject(null);
            setFormData({
                subject_code: '',
                subject_name: '',
                day_of_week: '',
                specific_date: '',
                start_time: '',
                end_time: '',
                academic_stage: 'stage_1',
                status: 'active',
                location: '',
                instructor_name: '',
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSubject(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            day_of_week: formData.day_of_week ? parseInt(formData.day_of_week) : undefined,
            specific_date: formData.specific_date || undefined,
            academic_stage: formData.academic_stage as Subject['academic_stage'],
            status: formData.status as Subject['status'],
        };

        if (editingSubject) {
            updateMutation.mutate({ id: editingSubject.subject_id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleDelete = (subject: Subject) => {
        if (confirm(`Are you sure you want to delete "${subject.subject_name}"?`)) {
            deleteMutation.mutate(subject.subject_id);
        }
    };

    const getDayName = (day?: number) => {
        if (day === undefined) return 'N/A';
        return DAYS_OF_WEEK.find(d => d.value === day)?.label || 'N/A';
    };

    const getStageLabel = (stage: string) => {
        return ACADEMIC_STAGES.find(s => s.value === stage)?.label || stage;
    };

    if (isLoading) return <div className="loading">Loading subjects...</div>;
    if (error) return <div className="error">Error loading subjects</div>;

    const subjects = data?.subjects || [];

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-content">
                    <h1>Subject Management</h1>
                    <p>Manage subjects with time windows and academic stages</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} /> Add Subject
                </button>
            </header>

            <div className="filters-row">
                <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Stages</option>
                    {ACADEMIC_STAGES.map(stage => (
                        <option key={stage.value} value={stage.value}>{stage.label}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div className="subjects-grid">
                {subjects.map((subject) => (
                    <div key={subject.subject_id} className={`subject-card ${subject.status}`}>
                        <div className="subject-header">
                            <span className="subject-code">{subject.subject_code}</span>
                            <span className={`status-badge ${subject.status}`}>
                                {subject.status}
                            </span>
                        </div>
                        <h3 className="subject-name">{subject.subject_name}</h3>

                        <div className="subject-details">
                            <div className="detail-item">
                                <Clock size={16} />
                                <span>{subject.start_time.slice(0, 5)} - {subject.end_time.slice(0, 5)}</span>
                            </div>
                            <div className="detail-item">
                                <GraduationCap size={16} />
                                <span>{getStageLabel(subject.academic_stage)}</span>
                            </div>
                            {subject.location && (
                                <div className="detail-item">
                                    <MapPin size={16} />
                                    <span>{subject.location}</span>
                                </div>
                            )}
                            <div className="detail-item">
                                <span className="day-label">
                                    {subject.specific_date
                                        ? new Date(subject.specific_date).toLocaleDateString()
                                        : getDayName(subject.day_of_week)
                                    }
                                </span>
                            </div>
                        </div>

                        {subject.instructor_name && (
                            <div className="subject-instructor">
                                Instructor: {subject.instructor_name}
                            </div>
                        )}

                        <div className="subject-actions">
                            <button
                                className="btn-icon"
                                onClick={() => toggleMutation.mutate(subject.subject_id)}
                                title={subject.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                                {subject.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                            <button
                                className="btn-icon"
                                onClick={() => openModal(subject)}
                                title="Edit"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                className="btn-icon btn-danger"
                                onClick={() => handleDelete(subject)}
                                title="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {subjects.length === 0 && (
                <div className="empty-state">
                    <p>No subjects found. Create your first subject!</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Subject Code *</label>
                                    <input
                                        type="text"
                                        value={formData.subject_code}
                                        onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                                        placeholder="e.g., CS101"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Subject Name *</label>
                                    <input
                                        type="text"
                                        value={formData.subject_name}
                                        onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                                        placeholder="e.g., Introduction to Programming"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Time *</label>
                                    <input
                                        type="time"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Time *</label>
                                    <input
                                        type="time"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Day of Week</label>
                                    <select
                                        value={formData.day_of_week}
                                        onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                                    >
                                        <option value="">Select a day</option>
                                        {DAYS_OF_WEEK.map(day => (
                                            <option key={day.value} value={day.value}>{day.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Specific Date (optional)</label>
                                    <input
                                        type="date"
                                        value={formData.specific_date}
                                        onChange={(e) => setFormData({ ...formData, specific_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Academic Stage *</label>
                                    <select
                                        value={formData.academic_stage}
                                        onChange={(e) => setFormData({ ...formData, academic_stage: e.target.value })}
                                        required
                                    >
                                        {ACADEMIC_STAGES.map(stage => (
                                            <option key={stage.value} value={stage.value}>{stage.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="e.g., Room 101"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Instructor Name</label>
                                    <input
                                        type="text"
                                        value={formData.instructor_name}
                                        onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                                        placeholder="e.g., Dr. Smith"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {editingSubject ? 'Update' : 'Create'} Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Subjects;
