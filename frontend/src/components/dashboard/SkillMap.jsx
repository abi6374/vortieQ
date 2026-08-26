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
        <h3 className="flex items-center gap-2 text-base font-bold text-gray-800">
          <span aria-hidden="true" className="text-lg">🧠</span>
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
