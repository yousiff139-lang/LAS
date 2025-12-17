/**
 * USB Flash Disk Import Service
 * Parses attendance logs and user data from files exported by FingerTec devices
 * 
 * Supports multiple file formats:
 * - .dat files (binary format)
 * - .txt files (text format)
 * - .csv files (comma-separated)
 */

export interface UsbLogEntry {
    biometric_user_id: string;
    timestamp: Date;
    event_type: 'fingerprint' | 'face' | 'card';
}

export interface UsbUserEntry {
    user_id: string;
    name: string;
    privilege?: number;
    card_number?: string;
}

export const usbImportService = {
    /**
     * Parse file based on extension
     */
    async parseFile(buffer: Buffer, filename: string): Promise<UsbLogEntry[]> {
        const ext = filename.toLowerCase().split('.').pop();

        switch (ext) {
            case 'dat':
                return this.parseDatFile(buffer);
            case 'txt':
                return this.parseTxtFile(buffer);
            case 'csv':
                return this.parseCsvFile(buffer);
            default:
                throw new Error(`Unsupported file format: ${ext}`);
        }
    },

    /**
     * Parse binary .dat file (ZK/FingerTec format)
     */
    parseDatFile(buffer: Buffer): UsbLogEntry[] {
        const logs: UsbLogEntry[] = [];

        // DAT file structure (varies by device):
        // Each record is typically 40 bytes
        const recordSize = 40;
        const recordCount = Math.floor(buffer.length / recordSize);

        for (let i = 0; i < recordCount; i++) {
            const offset = i * recordSize;

            try {
                // Parse record (structure may vary)
                // Typical structure: [User ID (9 bytes)][Timestamp (4 bytes)][Status (1 byte)]...
                const userIdBuffer = buffer.slice(offset, offset + 9);
                const userId = userIdBuffer.toString('ascii').replace(/\0/g, '').trim();

                if (!userId) continue;

                // Timestamp is typically stored as seconds since 2000-01-01
                const timestampValue = buffer.readUInt32LE(offset + 24);
                const baseDate = new Date('2000-01-01T00:00:00Z');
                const timestamp = new Date(baseDate.getTime() + timestampValue * 1000);

                // Event type byte
                const eventByte = buffer.readUInt8(offset + 28);
                const eventType = this.parseEventTypeByte(eventByte);

                logs.push({
                    biometric_user_id: userId,
                    timestamp,
                    event_type: eventType,
                });
            } catch (error) {
                // Skip malformed records
                continue;
            }
        }

        return logs;
    },

    /**
     * Parse text .txt file
     * Expected format: UserID\tTimestamp\tStatus\tEventType
     */
    parseTxtFile(buffer: Buffer): UsbLogEntry[] {
        const logs: UsbLogEntry[] = [];
        const content = buffer.toString('utf-8');
        const lines = content.split(/\r?\n/);

        for (const line of lines) {
            if (!line.trim()) continue;

            // Try tab-separated format
            let parts = line.split('\t');

            // If not tab-separated, try space-separated
            if (parts.length < 2) {
                parts = line.split(/\s+/);
            }

            if (parts.length >= 2) {
                const userId = parts[0].trim();
                const timestampStr = parts[1].trim();

                // Handle various timestamp formats
                let timestamp: Date;

                // Format: YYYY-MM-DD HH:MM:SS
                if (parts.length >= 3 && parts[1].includes('-')) {
                    timestamp = new Date(`${parts[1]} ${parts[2]}`);
                } else {
                    timestamp = new Date(timestampStr);
                }

                if (isNaN(timestamp.getTime())) continue;

                let eventType: 'fingerprint' | 'face' | 'card' = 'fingerprint';
                if (parts.length >= 4) {
                    eventType = this.parseEventTypeString(parts[3]);
                }

                logs.push({
                    biometric_user_id: userId,
                    timestamp,
                    event_type: eventType,
                });
            }
        }

        return logs;
    },

    /**
     * Parse CSV file
     * Expected columns: user_id, timestamp, event_type
     */
    parseCsvFile(buffer: Buffer): UsbLogEntry[] {
        const logs: UsbLogEntry[] = [];
        const content = buffer.toString('utf-8');
        const lines = content.split(/\r?\n/);

        // Get header row
        const headers = lines[0]?.toLowerCase().split(',').map(h => h.trim()) || [];

        const userIdCol = headers.findIndex(h => h.includes('user') || h.includes('id'));
        const timestampCol = headers.findIndex(h => h.includes('time') || h.includes('date'));
        const eventCol = headers.findIndex(h => h.includes('event') || h.includes('type'));

        if (userIdCol === -1 || timestampCol === -1) {
            throw new Error('CSV must have user_id and timestamp columns');
        }

        // Process data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const parts = this.parseCsvLine(line);

            if (parts.length > Math.max(userIdCol, timestampCol)) {
                const userId = parts[userIdCol].trim();
                const timestamp = new Date(parts[timestampCol].trim());

                if (!userId || isNaN(timestamp.getTime())) continue;

                let eventType: 'fingerprint' | 'face' | 'card' = 'fingerprint';
                if (eventCol !== -1 && parts[eventCol]) {
                    eventType = this.parseEventTypeString(parts[eventCol]);
                }

                logs.push({
                    biometric_user_id: userId,
                    timestamp,
                    event_type: eventType,
                });
            }
        }

        return logs;
    },

    /**
     * Parse CSV line handling quoted values
     */
    parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    },

    /**
     * Parse event type from byte value
     */
    parseEventTypeByte(byte: number): 'fingerprint' | 'face' | 'card' {
        switch (byte) {
            case 0:
            case 1:
                return 'fingerprint';
            case 2:
            case 15:
                return 'face';
            case 3:
            case 4:
                return 'card';
            default:
                return 'fingerprint';
        }
    },

    /**
     * Parse event type from string
     */
    parseEventTypeString(str: string): 'fingerprint' | 'face' | 'card' {
        const lower = str.toLowerCase().trim();

        if (lower.includes('face')) return 'face';
        if (lower.includes('card')) return 'card';
        return 'fingerprint';
    },

    /**
     * Parse user data file
     */
    parseUserFile(buffer: Buffer, filename: string): UsbUserEntry[] {
        const ext = filename.toLowerCase().split('.').pop();
        const content = buffer.toString('utf-8');
        const lines = content.split(/\r?\n/);
        const users: UsbUserEntry[] = [];

        for (const line of lines) {
            if (!line.trim()) continue;

            const parts = ext === 'csv'
                ? this.parseCsvLine(line)
                : line.split('\t');

            if (parts.length >= 2) {
                users.push({
                    user_id: parts[0].trim(),
                    name: parts[1].trim(),
                    privilege: parts[2] ? parseInt(parts[2]) : undefined,
                    card_number: parts[3]?.trim(),
                });
            }
        }

        return users;
    },
};
