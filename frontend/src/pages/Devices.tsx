import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Edit, Trash2, X, Wifi, Usb, Smartphone, RefreshCw, Copy, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { deviceApi, Device } from '../services/api';
import './Pages.css';

function Devices() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showModal, setShowModal] = useState(false);
    const [importDeviceId, setImportDeviceId] = useState<string | null>(null);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [formData, setFormData] = useState({
        biometric_device_id: '',
        ip_address: '',
        rs485_address: '',
        usb_enabled: false,
        aosp_connection_enabled: false,
        location: '',
        serial_port: '',
        baud_rate: 115200,
    });

    const { data: devices, isLoading } = useQuery({
        queryKey: ['devices'],
        queryFn: () => deviceApi.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: deviceApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            toast.success('Device created successfully');
            closeModal();
        },
        onError: () => toast.error('Failed to create device'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Device> }) => deviceApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            toast.success('Device updated successfully');
            closeModal();
        },
        onError: () => toast.error('Failed to update device'),
    });

    const deleteMutation = useMutation({
        mutationFn: deviceApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            toast.success('Device deleted successfully');
        },
        onError: () => toast.error('Failed to delete device'),
    });

    const regenerateTokenMutation = useMutation({
        mutationFn: deviceApi.regenerateToken,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            toast.success('AOSP token regenerated');
        },
        onError: () => toast.error('Failed to regenerate token'),
    });

    const importUsbMutation = useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => deviceApi.importUsb(id, file),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            toast.success(data.message || 'USB logs imported successfully');
        },
        onError: () => toast.error('Failed to import USB logs'),
    });

    const openModal = (device?: Device) => {
        if (device) {
            setEditingDevice(device);
            setFormData({
                biometric_device_id: device.biometric_device_id,
                ip_address: device.ip_address || '',
                rs485_address: device.rs485_address || '',
                usb_enabled: device.usb_enabled,
                aosp_connection_enabled: device.aosp_connection_enabled,
                location: device.location || '',
                serial_port: device.serial_port || '',
                baud_rate: device.baud_rate || 115200,
            });
        } else {
            setEditingDevice(null);
            setFormData({
                biometric_device_id: '',
                ip_address: '',
                rs485_address: '',
                usb_enabled: false,
                aosp_connection_enabled: false,
                location: '',
                serial_port: '',
                baud_rate: 115200,
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingDevice(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDevice) {
            updateMutation.mutate({ id: editingDevice.device_id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this device?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && importDeviceId) {
            importUsbMutation.mutate({ id: importDeviceId, file });
        }
        setImportDeviceId(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(token);
        toast.success('Token copied to clipboard');
    };

    return (
        <div className="page">
            <header className="page-header">
                <div>
                    <h1>Devices</h1>
                    <p>Manage biometric devices and connection settings</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} />
                    Add Device
                </button>
            </header>

            <input
                ref={fileInputRef}
                type="file"
                accept=".dat,.txt,.csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
            />

            <div className="devices-grid">
                {isLoading ? (
                    <div className="loading-container">
                        <div className="spinner"></div>
                    </div>
                ) : devices?.length === 0 ? (
                    <div className="empty-state card">
                        <p>No devices configured</p>
                    </div>
                ) : (
                    devices?.map((device) => (
                        <div key={device.device_id} className="device-panel card">
                            <div className="device-panel-header">
                                <div className="device-panel-title">
                                    <h3>{device.biometric_device_id}</h3>
                                    <span className={`device-status ${device.is_active ? 'active' : 'inactive'}`}>
                                        {device.is_active ? '● Online' : '○ Offline'}
                                    </span>
                                </div>
                                <div className="device-panel-actions">
                                    <button className="btn-icon" onClick={() => openModal(device)}>
                                        <Edit size={16} />
                                    </button>
                                    <button className="btn-icon danger" onClick={() => handleDelete(device.device_id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="device-panel-info">
                                <p><strong>Location:</strong> {device.location || 'Not set'}</p>
                                {device.ip_address && <p><strong>IP:</strong> {device.ip_address}</p>}
                                {device.last_sync_time && (
                                    <p><strong>Last Sync:</strong> {new Date(device.last_sync_time).toLocaleString()}</p>
                                )}
                            </div>

                            <div className="device-panel-modes">
                                <span className={`mode-indicator ${device.ip_address ? 'active' : ''}`}>
                                    <Wifi size={14} /> TCP/IP
                                </span>
                                <span className={`mode-indicator ${device.rs485_address ? 'active' : ''}`}>
                                    RS485
                                </span>
                                <span className={`mode-indicator ${device.usb_enabled ? 'active' : ''}`}>
                                    <Usb size={14} /> USB
                                </span>
                                <span className={`mode-indicator ${device.aosp_connection_enabled ? 'active' : ''}`}>
                                    <Smartphone size={14} /> AOSP
                                </span>
                            </div>

                            {device.aosp_connection_enabled && device.aosp_token && (
                                <div className="device-panel-token">
                                    <label>AOSP Token</label>
                                    <div className="token-display">
                                        <code>{device.aosp_token.slice(0, 16)}...</code>
                                        <button className="btn-icon small" onClick={() => copyToken(device.aosp_token!)}>
                                            <Copy size={14} />
                                        </button>
                                        <button
                                            className="btn-icon small"
                                            onClick={() => regenerateTokenMutation.mutate(device.device_id)}
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="device-panel-footer">
                                {device.usb_enabled && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setImportDeviceId(device.device_id);
                                            fileInputRef.current?.click();
                                        }}
                                        disabled={importUsbMutation.isPending}
                                    >
                                        <Upload size={16} />
                                        Import USB
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDevice ? 'Edit Device' : 'Add Device'}</h2>
                            <button className="btn-icon" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">Device ID *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.biometric_device_id}
                                        onChange={(e) => setFormData({ ...formData, biometric_device_id: e.target.value })}
                                        required
                                    />
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

                            <h4 className="form-section-title">TCP/IP Settings</h4>
                            <div className="form-group">
                                <label className="label">IP Address</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="192.168.1.100"
                                    value={formData.ip_address}
                                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                                />
                            </div>

                            <h4 className="form-section-title">RS485 Settings</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="label">RS485 Address</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.rs485_address}
                                        onChange={(e) => setFormData({ ...formData, rs485_address: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Serial Port</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="COM1"
                                        value={formData.serial_port}
                                        onChange={(e) => setFormData({ ...formData, serial_port: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="label">Baud Rate</label>
                                    <select
                                        className="input"
                                        value={formData.baud_rate}
                                        onChange={(e) => setFormData({ ...formData, baud_rate: parseInt(e.target.value) })}
                                    >
                                        <option value="9600">9600</option>
                                        <option value="19200">19200</option>
                                        <option value="38400">38400</option>
                                        <option value="57600">57600</option>
                                        <option value="115200">115200</option>
                                    </select>
                                </div>
                            </div>

                            <h4 className="form-section-title">Other Settings</h4>
                            <div className="form-row checkbox-row">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.usb_enabled}
                                        onChange={(e) => setFormData({ ...formData, usb_enabled: e.target.checked })}
                                    />
                                    Enable USB Import
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={formData.aosp_connection_enabled}
                                        onChange={(e) => setFormData({ ...formData, aosp_connection_enabled: e.target.checked })}
                                    />
                                    Enable AOSP Connection
                                </label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingDevice ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Devices;
