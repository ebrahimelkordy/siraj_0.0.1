import React from 'react'
import { Link } from 'react-router'
import arabicFlag from '../assests/arflag.png'

const LANGUAGE_TO_FLAG = {
    'english': 'gb',
    'arabic': 'ar',
    'french': 'fr',
    'spanish': 'es',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'russian': 'ru',
    'chinese': 'cn',
    'japanese': 'jp',
    'korean': 'kr',
    'hindi': 'in',
    'turkish': 'tr',
    'dutch': 'nl',
    'swedish': 'se',
    'polish': 'pl',
    'greek': 'gr',
    'hebrew': 'il',
    'persian': 'ir',
    'urdu': 'pk',
    'bengali': 'bd',
    'indonesian': 'id',
    'malay': 'my',
    'thai': 'th',
    'vietnamese': 'vn'
};

const FriendCard = ({ friend, user }) => {
    return (
        <div className="card bg-base-300 hover:shadow-md transition-shadow m-4">
            <div className="card-body p-4">
                {/* USER INFO */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="avatar size-12">
                        <img src={friend.profilePic} alt={friend.fullName} />
                        <p className='overflow-hidden text-ellipsis'>{friend.bio}</p>
                    </div>
                    <h3 className="font-semibold truncate">{friend.fullName}</h3>
                </div >
                <div className="flex-col">
                    <span className="badge badge-secondary text-xs  h-auto m-1">
                        {getLanguageFlag(friend.nativeLanguage)}
                        Native: {friend.nativeLanguage}
                    </span>
                    <div className="flex flex-wrap">
                        {friend.learningLanguage && (
                            <span className="badge badge-outline text-xs h-auto m-1">
                                {getLanguageFlag(friend.learningLanguage)}
                                Learning: {friend.learningLanguage}
                            </span>
                        )}
                        {friend.educationalPath && (
                            <span className="badge badge-outline text-xs  h-auto m-1">
                                Learning: {friend.educationalPath}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <Link to={`/chat/${friend._id}`} className="btn btn-outline w-full">
                Message
            </Link>
        </div>
    )
}

export default FriendCard
export function getLanguageFlag(language) {
    if (!language) return null;

    const langLower = language.toLowerCase();
    const countryCode = LANGUAGE_TO_FLAG[langLower];

    if (countryCode) {
        return countryCode === "ar" ? (
            <img
                src={arabicFlag}
                alt={`${langLower} flag`}
                style={{ width: '19px', height: '13px' }}
                className="mr-1 inline-block"
            />
        ) : (
            <img
                src={`https://flagcdn.com/24x18/${countryCode}.png`}
                alt={`${langLower} flag`}
                className="h-3 mr-1 inline-block"
            />
        );
    }
    return null;
}