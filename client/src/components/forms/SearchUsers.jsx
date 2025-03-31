import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SearchUsers() {
    const [search, setSearch] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // Handle search input and prevent spaces
    const handleChange = (e) => {
        const value = e.target.value.replace(/\s/g, ''); // Remove spaces
        setSearch(value);
    };

    // Fetch matching users
    useEffect(() => {
        const fetchUsers = async () => {
            if (search.trim() === '') {
                setUsers([]);
                return;
            }

            setLoading(true);

            try {
                const response = await axios.get(`https://jsonplaceholder.typicode.com/users`);

                // Filter matching users
                const filteredUsers = response.data.filter((user) =>
                    user.username.toLowerCase().startsWith(search.toLowerCase())
                );

                setUsers(filteredUsers);
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                setLoading(false);
            }
        };

        // Add a delay to avoid excessive API calls
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    return (
        <>
            <div className="flex fixed top-[50%] left-[50%] translate-y-[-50%] translate-x-[-50%] flex-col items-center justify-center w-[90vw] p-5">
                <div className="bg-gray-800 rounded-md  shadow-md rounded-lg p-6 w-full max-w-md">
                    <h1 className="text-xl mb-4 dark:text-white">Search Users</h1>

                    <form className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={handleChange}
                            placeholder="Search by username"
                            className="w-full p-3 border text-sm dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {loading && (
                            <div className="absolute top-full left-0 w-full h-1 bg-blue-500 animate-pulse"></div>
                        )}
                    </form>

                    {/* Dropdown with matching users */}
                    <div className="mt-4 bg-white border text-sm rounded-lg shadow-md">
                        {users.length > 0 ? (
                            <ul>
                                {users.map((user) => (
                                    <li
                                        key={user.id}
                                        className="p-3 hover:bg-blue-100 transition cursor-pointer"
                                    >
                                        <span className="dark:text-white">{user.username}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            !loading && search && (
                                <div className="p-3 text-gray-500">No matching users found</div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
