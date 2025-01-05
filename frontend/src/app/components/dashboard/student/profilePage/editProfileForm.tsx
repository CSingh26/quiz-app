import { Button } from "@/components/ui/button"

const EditProfileForm = ({
  formData,
  setFormData,
  onCancel,
  onSave,
}: {
  formData: any
  setFormData: (data: any) => void
  onCancel: () => void
  onSave: () => void
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: files ? files[0] : null,
    }))
  }

  return (
    <form
      className="flex flex-col gap-4 w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <div>
        <label htmlFor="name">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className="w-full p-2 text-black rounded-lg"
        />
      </div>
      <div>
        <label htmlFor="username">Username</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          className="w-full p-2 text-black rounded-lg"
        />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full p-2 text-black rounded-lg"
        />
      </div>
      <div>
        <label htmlFor="background">Background</label>
        <input
          type="file"
          name="background"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full p-2 text-black rounded-lg"
        />
      </div>
      <div>
        <label htmlFor="avatar">User Avatar</label>
        <input
          type="file"
          name="avatar"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full p-2 text-black rounded-lg"
        />
      </div>
      <div className="flex justify-between">
        <Button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-[rgb(234,178,187)] hover:bg-[#f099a8] text-black font-semibold px-6 py-3 rounded-lg"
        >
          Save
        </Button>
      </div>
    </form>
  )
}

export default EditProfileForm