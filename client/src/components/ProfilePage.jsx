import React from 'react'

export default function ProfilePage() {
    const [profile, setProfile] = useState(second)
  return (
    <div className='ProfilePage flex-1 flex flex-col'>
        <div className="img"><img src={profile.pfp} alt="" /></div>
        <div className=""></div>
    </div>
  )
}
