"use client"

const features = [
    {
        image: "/Assests/HomePage/Upload.png",
        title: "Upload Quiz as Instructor",
    },
    {
        image: "Assessts/HomePage/MakeRoom.png",
        title: "Create Room as Instructor",
    },
    {
        image: "Assessts/HomePage/TakeQuiz.png",
        title: "Take Quiz as Student",
    },
    {
        image: "Assessts/HomePage/Ranling.png",
        title: "See Your Ranking in the Quiz",
    }
]

const Features = () => {
    return (
        <div className="w-full bg-[#eab2bb] rounded-full py-10 px-6 shawdow-md mt-10 custom-font-2">
            <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8 md:grid-cols-4 text-center">
                {features.map((feature, index) => (
                    <div key={index}>
                        <img 
                            src={feature.image} 
                            alt={feature.title} 
                            className="w-16 h-16 mx-auto mb-4"
                        />
                        <p className="font-semibold">{feature.title}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Features