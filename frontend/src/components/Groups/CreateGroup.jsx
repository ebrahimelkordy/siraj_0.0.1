import { useState } from 'react';
import toast from 'react-hot-toast';
import { LANGUAGES, EDUCATIONAL_PATHS } from '../../constants';

export const CreateGroup = ({ isOpen, onClose, onGroupCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [field, setField] = useState(''); // المجال المتناول
  const [fieldType, setFieldType] = useState(''); // نوع المجال: لغة أو مسار
  const [loading, setLoading] = useState(false);

  // استخدام القوائم من الكونستانتس
  const languageOptions = LANGUAGES.filter(l => l && l !== 'other').map(l => ({ value: l, label: l }));
  const trackOptions = EDUCATIONAL_PATHS.filter(t => t && t !== 'other').map(t => ({ value: t, label: t }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          description,
          privacy,
          field,
          fieldType
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create group: ${response.status}`);
      }

      const data = await response.json();
      toast.success('Group created successfully');
      onGroupCreated(data);
      onClose();
    } catch (error) {
      // Optionally show error to user
      toast.error(error.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50">
      <div className="modal-box max-w-lg bg-base-100 shadow-2xl border border-base-300 rounded-2xl p-8 relative animate-fade-in">
        <button
          type="button"
          className="btn btn-sm btn-circle btn-ghost absolute left-4 top-4"
          onClick={onClose}
          aria-label="Close"
        >
          <i className="fa fa-close"></i>
        </button>
        <h3 className="font-extrabold text-2xl mb-6 text-center text-primary tracking-tight">Create New Group</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Group Name <span className='text-error'>*</span></span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered input-lg font-bold text-lg"
              required
              minLength={3}
              maxLength={50}
              placeholder="e.g. Programming Club or English Club"
              autoFocus
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Group Description</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered textarea-lg min-h-[80px]"
              rows="3"
              maxLength={200}
              placeholder="A brief about the group's purpose or rules..."
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Privacy</span>
            </label>
            <div className="flex gap-2">
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="public">Public (visible to everyone)</option>
                <option value="private">Private (only visible to members)</option>
                <option value="restricted">Restricted (very secret)</option>
              </select>
              <span className="tooltip tooltip-left" data-tip="Restricted groups are invisible to non-members!">
                <i className="fa fa-info-circle text-info"></i>
              </span>
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Field <span className="text-xs text-gray-400">(Optional)</span></span>
            </label>
            <div className="flex gap-2">
              <select
                value={fieldType}
                onChange={e => { setFieldType(e.target.value); setField(''); }}
                className="select select-bordered w-1/2"
              >
                <option value="">Field Type</option>
                <option value="language">Language</option>
                <option value="track">Educational Track</option>
              </select>
              {fieldType === 'language' && (
                <select
                  value={field}
                  onChange={e => setField(e.target.value)}
                  className="select select-bordered w-1/2"
                >
                  <option value="">Select Language</option>
                  {languageOptions.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              )}
              {fieldType === 'track' && (
                <select
                  value={field}
                  onChange={e => setField(e.target.value)}
                  className="select select-bordered w-1/2"
                >
                  <option value="">Select Track</option>
                  {trackOptions.map(track => (
                    <option key={track.value} value={track.value}>{track.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="modal-action flex justify-between items-center mt-8 gap-4">
            <button
              type="button"
              className="btn btn-outline w-1/3"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary w-2/3 text-lg font-bold"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <i className="fa fa-plus mr-2"></i>
                  Create
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
