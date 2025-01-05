import Image from "next/image"
import { Button } from "@/components/ui/button"

const ProfileCard = ({
  profile,
  onEditClick,
}: {
  profile: any
  onEditClick: () => void
}) => {
  return (
    <>
      <div className="relative w-full h-1/3 bg-black overflow-hidden">
        <Image
          src={profile?.background || "/Assests/Images/default-background.jpg"}
          alt="Background"
          fill
          className="object-cover"
        />
      </div>

      <div className="absolute top-[24%] left-1/2 transform -translate-x-1/2 flex flex-col items-center">
        <div className="w-[250px] h-[250px] relative rounded-full overflow-hidden">
          <Image
            src={profile?.avatar || "/Assests/Images/default-user.png"}
            alt="Profile Picture"
            width={250}
            height={250}
            className="rounded-full object-cover"
          />
        </div>
      </div>

      <div className="flex-1 bg-[#3c6ca8] flex flex-col justify-start pt-32 px-8 text-white">
        <div className="text-lg mb-8">
          <p className="mb-4">
            <strong>USERNAME: </strong> {profile?.username || "Placeholder"}
          </p>
          <p className="mb-4">
            <strong>NAME: </strong> {profile?.name || "Placeholder"}
          </p>
          <p className="mb-4">
            <strong>EMAIL: </strong> {profile?.email || "Placeholder"}
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Button
          onClick={onEditClick}
          className="bg-[rgb(234,178,187)] hover:bg-[#f099a8] text-black font-semibold px-6 py-3 rounded-lg"
        >
          UPDATE PROFILE
        </Button>
      </div>
    </>
  )
}

export default ProfileCard