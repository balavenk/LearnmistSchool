import React from 'react';
import { Link } from 'react-router-dom';

const Settings: React.FC = () => {
    const linkCards = [
        { title: 'Countries', path: '/settings/countries', description: 'Manage supported countries', color: 'bg-blue-500' },
        { title: 'Curriculum', path: '/settings/curriculums', description: 'Manage education boards/curriculums', color: 'bg-indigo-500' },
        { title: 'School Type', path: '/settings/school-types', description: 'Manage school levels (Primary, High School, etc.)', color: 'bg-purple-500' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-500">Manage global master data and configurations.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {linkCards.map((card) => (
                    <Link
                        key={card.path}
                        to={card.path}
                        className="block p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group"
                    >
                        <div className={`w-12 h-12 rounded-lg ${card.color} text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            <span className="text-xl font-bold">{card.title[0]}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                            {card.title}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {card.description}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Settings;
