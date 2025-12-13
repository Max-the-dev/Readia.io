import { User } from 'lucide-react';
import XLogo from '../XLogo';
import { Github } from 'lucide-react';

interface TeamMemberCardProps {
  name: string;
  role: string;
  bio: string;
  avatar?: string;
  social?: {
    twitter?: string;
    github?: string;
  };
}

function TeamMemberCard({ name, role, bio, avatar, social }: TeamMemberCardProps) {
  return (
    <div className="team-card">
      <div className="team-avatar">
        {avatar ? (
          <img src={avatar} alt={name} />
        ) : (
          <div className="team-avatar-placeholder">
            <User size={40} />
          </div>
        )}
      </div>
      <h3>{name}</h3>
      <p className="team-role">{role}</p>
      <p className="team-bio">{bio}</p>
      {social && (
        <div className="team-social">
          {social.twitter && (
            <a href={social.twitter} target="_blank" rel="noopener noreferrer">
              <XLogo size={18} />
            </a>
          )}
          {social.github && (
            <a href={social.github} target="_blank" rel="noopener noreferrer">
              <Github size={18} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamMemberCard;
