import React from 'react'

/**
 * SkillMap
 * Shows the distinct skills a learner has earned by completing steps.
 *
 * Props:
 *   skills - string[] of skill tags gained
 */
export default function SkillMap({ skills = [] }) {
  const hasSkills = Array.isArray(skills) && skills.length > 0

  return (
    <section className="bg-white rounded-2xl shadow p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 dark:text-white">
          <svg className="w-5 h-5 text-[#0066cc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4.5 4.5 0 0 0-4.5 4.5c0 .6.1 1.2.4 1.7A4.5 4.5 0 0 0 6 12.5c0 1.2.5 2.3 1.3 3.1A4.5 4.5 0 0 0 12 22a4.5 4.5 0 0 0 4.7-6.4A4.5 4.5 0 0 0 18 12.5a4.5 4.5 0 0 0-1.9-3.7c.3-.5.4-1.1.4-1.7A4.5 4.5 0 0 0 12 2z" />
          </svg>
          Skills Gained
        </h3>
        {hasSkills && (
          <span className="text-xs font-semibold text-gray-400">
            {skills.length} earned
          </span>
        )}
      </div>

      {hasSkills ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, idx) => (
            <span
              key={`${skill}-${idx}`}
              className="bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-gray-400">
          Complete steps in your roadmap to see skills you've earned
        </p>
      )}
    </section>
  )
}
