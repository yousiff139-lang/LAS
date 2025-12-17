import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentApi, Student } from '../services/api';
import './Pages.css';

function Students() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState({
        biometric_user_id: '',
        name: '',
        email: '',
        phone: '',
        department: '',
        status: 'active' as 'active' | 'inactive',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['students', search],
        queryFn: () => studentApi.getAll({ search, limit: 100 }),
    });

    const createMutation = useMutation({
        mutationFn: studentApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            toast.success('Student created successfully');
            closeModal();
        },
        onError: () => toast.error('Failed to create student'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => studentApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            toast.success('Student updated successfully');
            closeModal();
        },
        onError: () => toast.error('Failed to update student'),
    });

    const deleteMutation = useMutation({
        mutationFn: studentApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] });
            toast.success('Student deleted successfully');
        },
        onError: () => toast.error('Failed to delete student'),
    });

    const openModal = (student?: Student) => {
        if (student) {
            setEditingStudent(student);
            setFormData({
                biometric_user_id: student.biometric_user_id,
                name: student.name,
                email: student.email || '',
                phone: student.phone || '',
                department: student.department || '',
                status: student.status,
            });
        } else {
            setEditingStudent(null);
            setFormData({
                biometric_user_id: '',
                name: '',
                email: '',
                phone: '',
                department: '',
                status: 'active',
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingStudent(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStudent) {
            updateMutation.mutate({ id: editingStudent.student_id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this student?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1>Students</h1>
                    <p>Manage student records and biometric IDs</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Add Student
                </button>
            </header>

            <div className="filters">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search by name, email, or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Biometric ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Department</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="loading-cell">
                                    <div className="spinner"></div>
                                </td>
                            </tr>
                        ) : data?.students?.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="empty-cell">No students found</td>
                            </tr>
                        ) : (
                            data?.students?.map((student) => (
                                <tr key={student.student_id}>
                                    <td><code>{student.biometric_user_id}</code></td>
                                    <td>{student.name}</td>
                                    <td>{student.email || '-'}</td>
                                    <td>{student.phone || '-'}</td>
                                    <td>{student.department || '-'}</td>
                                    <td>
                                        <span className={`badge badge-${student.status === 'active' ? 'success' : 'danger'}`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => openModal(student)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(student.student_id)}>
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
                            <h2>{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
                            <button className="btn-icon" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="label">Biometric User ID *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.biometric_user_id}
                                    onChange={(e) => setFormData({ ...formData, biometric_user_id: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Full Name *</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Phone</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Department</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Status</label>
                                    <select
                                        className="input"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingStudent ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Students;
