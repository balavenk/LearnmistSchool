import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const Settings: React.FC = () => {
    // const [schools, setSchools] = useState<any[]>([]); // No longer needed
    const [grades, setGrades] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);

    const [schoolId, setSchoolId] = useState<number | null>(null);
    // schoolName display available if needed

    const [selectedGrade, setSelectedGrade] = useState<number | ''>('');
    const [selectedClass, setSelectedClass] = useState<number | ''>('');

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            const res = await api.get('/auth/me');
            if (res.data.school_id) {
                setSchoolId(res.data.school_id);
                // Optionally fetch school details if we want to show name
                // For "Individual", we know it's Individual, but being dynamic is better.
                // We'll skip name fetch for now or trust it's set.
            }
        } catch (err) {
            console.error("Failed to fetch user info", err);
        }
    };

    // When school changes (loaded), fetch grades
    useEffect(() => {
        if (schoolId) {
            const fetchGrades = async () => {
                try {
                    const res = await api.get(`/individual/schools/${schoolId}/grades`);
                    setGrades(res.data);
                } catch (err) { console.error(err); }
            };
            fetchGrades();
        }
    }, [schoolId]);

    // When grade changes, fetch classes
    useEffect(() => {
        if (schoolId && selectedGrade) {
            const fetchClasses = async () => {
                try {
                    const res = await api.get(`/individual/schools/${schoolId}/grades/${selectedGrade}/classes`);
                    setClasses(res.data);
                } catch (err) { console.error(err); }
            };
            fetchClasses();
        }
    }, [selectedGrade, schoolId]);


    const handleSave = async () => {
        if (!schoolId || !selectedGrade) return;
        setIsLoading(true);
        try {
            await api.put('/individual/link-school', null, {
                params: {
                    school_id: schoolId, // Pass current school ID to satisfy backend
                    grade_id: selectedGrade,
                    class_id: selectedClass || null
                }
            });
            alert("Settings saved successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to save settings.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl">
                <h2 className="text-lg font-semibold mb-4">Academic Settings</h2>
                <p className="text-slate-500 mb-6 text-sm">
                    {/* Update description since linking is done on registration */}
                    Select your Grade to customize your learning experience.
                </p>

                <div className="space-y-4">
                    {/* School is hidden or read-only */}
                    {/* <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">School</label>
                        <input type="text" value="Individual" disabled className="w-full border rounded-lg px-3 py-2 bg-slate-100" />
                    </div> */}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Grade</label>
                        <select
                            value={selectedGrade}
                            onChange={e => setSelectedGrade(Number(e.target.value))}
                            disabled={!schoolId}
                            className="w-full border rounded-lg px-3 py-2 disabled:bg-slate-100"
                        >
                            <option value="">-- Select Grade --</option>
                            {grades.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Class (Optional)</label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(Number(e.target.value))}
                            disabled={!schoolId || !selectedGrade}
                            className="w-full border rounded-lg px-3 py-2 disabled:bg-slate-100"
                        >
                            <option value="">-- Select Class --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleSave}
                            disabled={isLoading || !schoolId || !selectedGrade}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isLoading ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
