export interface TeamMember {
  name: string;
  role: string;
  description: string;
  image?: string;
  linkedin?: string;
  github?: string;
}

export const teamMembers: TeamMember[] = [
  {
    name: "Dustin Harrell",
    role: "Chief Executive Officer",
    description:
      "Founder and CEO who originated the vision for the platform, leads product strategy, and drives overall execution across teams.",
    linkedin: "https://www.linkedin.com/in/dustin-harrell-43a540249/",
    image: "team/img/DH.jpg",
  },
  {
    name: "Christopher Derys",
    role: "Chief Operating Officer",
    description:
      "Oversees daily operations, workflow efficiency, and user-seller interactions.",
    image: "team/img/CD.jpeg",
  },
  {
    name: "Alex Mohamed",
    role: "Chief Financial Officer",
    description:
      "Handles financial strategy, investor communication, and platform sustainability.",
    linkedin: "https://www.linkedin.com/in/alexk-mohamed/",
    image: "team/img/AM.jpg",
  },
  {
    name: "Noah Dominguez Vega",
    role: "Chief Technology Officer",
    description:
      "Leads the platform's technical vision, overseeing architecture, scalability, and the engineering roadmap.",
    image: "team/img/N.jpeg",
  },
  {
    name: "Mohamed Abdelmaksoud",
    role: "Developer",
    description:
      "Leads full-stack development, building the UI, integrating core systems, and deploying the platform live.",
    linkedin: "https://www.linkedin.com/in/mohamed-abdelmaksoud-6b416b295/",
    github: "https://github.com/MoMaksoud",
    image: "team/img/MA.png",
  },
  {
    name: "Mario Sinclair",
    role: "Developer",
    description:
      "Designs and manages the database, contributes to the UI, and drives mobile app development toward App Store release.",
    linkedin: "https://www.linkedin.com/in/mario-sinclair/",
    github: "https://github.com/MarioSinclair",
    image: "team/img/MS.jpg",
  },
  {
    name: "Yengner Bermudez",
    role: "Developer",
    description:
      "Strengthens backend architecture and infrastructure to improve performance, reliability, and scalability.",
    linkedin: "https://www.linkedin.com/in/yengner-bermudez/",
    github: "https://github.com/Yengner",
    image: "team/img/YB.jpg",
  },
  {
    name: "Fahada Alathel",
    role: "Developer",
    description:
      "Optimizes database systems and enhances backend efficiency for faster, more resilient data operations.",
    linkedin: "https://www.linkedin.com/in/fahada-alathel/",
    github: "https://github.com/ffalathel",
    image: "team/img/FA.jpg",
  },
  {
    name: "Mark Halim",
    role: "Developer",
    description:
      "Builds and maintains core platform features, ensuring performance, scalability, and a seamless user experience.",
    linkedin: "https://www.linkedin.com/in/mark-halim-287446268/",
    github: "",
    image: "team/img/MH.jpeg",
  },
];
