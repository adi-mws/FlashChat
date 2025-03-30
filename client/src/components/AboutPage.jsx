import React, { useEffect, useState } from 'react'

export default function AboutPage() {
    const [updates, setUpdates] = useState([]);
    useEffect(() => {
        setUpdates(
            [
                {
                    "version": "1.3.2",
                    "title": "Bug Fixes and Minor Tweaks",
                    "description": "Resolved multiple minor bugs affecting performance stability. Improved backend error handling and refined API response times. Enhanced security measures to prevent potential vulnerabilities."
                },
                {
                    "version": "1.3.0",
                    "title": "UI Enhancements",
                    "description": "Revamped the user interface with a modern design. Improved color contrast for accessibility. Added interactive animations and refined button transitions for a smoother user experience."
                },
                {
                    "version": "1.2.0",
                    "title": "Performance Improvement",
                    "description": "Optimized database queries for faster data retrieval. Reduced page load time by implementing lazy loading. Enhanced caching strategies to minimize repeated API calls."
                },
                {
                    "version": "1.1.0",
                    "title": "Feature Update",
                    "description": "Introduced user authentication with JWT tokens. Added support for password reset via email. Implemented customizable profile settings and improved form validation."
                },
                {
                    "version": "1.0.0",
                    "title": "Initial Release",
                    "description": "Launched the first stable version with core features, including user registration, basic CRUD operations, and a responsive layout. Established the foundation for future updates."
                }
            ]
            

        )
    }, [])
    return (
        <div className='AboutPage'>
            <div className="update-container flex flex-col gap-3 p-5">
                {updates.map((item, index) => (
                    <div className="update flex flex-col gap-2 rounded-md shadow-sm p-5 dark:bg-gray-900">
                        <div className="title-container flex flex-col gap-4 xs:gap-0 xs:flex-row justify-between ">
                            <p className="title dark:text-white text-center xs:text-start font-bold text-lg">{item?.title}</p>
                            <p className="title dark:text-primary text-sm bg-primary-3 text-center font-bold dark:font-normal xs:text-start text-primary-1 rounded-md py-2 px-5 ">Version {item?.version}</p>
                        </div>
                        <div className="description flex-col dark:text-gray-300 text-gray-700 text-sm">
                            {item?.description}
                        </div>
                    </div>
                ))}

            </div>
        </div>
    )
}
