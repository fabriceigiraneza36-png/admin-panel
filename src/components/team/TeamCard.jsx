import { motion } from 'framer-motion';
import { Edit2, Trash2, Mail, Linkedin, Twitter, MessageCircle } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

const TeamCard = ({ member, onEdit, onDelete }) => {
  return (
    <motion.div whileHover={{ y: -4 }}>
      <Card hoverable>
        {/* Image */}
        <div className="h-40 -m-6 mb-4 rounded-t-xl overflow-hidden bg-gradient-to-br from-primary-300 to-primary-600">
          {member.image_url ? (
            <img
              src={member.image_url}
              alt={member.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl font-bold text-white opacity-30">
                {member.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {member.name}
            </h3>
            <p className="text-sm text-gray-600 font-medium">{member.role}</p>
            <Badge variant="info" className="mt-2">
              {member.department}
            </Badge>
          </div>

          {member.bio && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {member.bio}
            </p>
          )}

          {/* Skills */}
          {member.expertise && member.expertise.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-2">Expertise</p>
              <div className="flex flex-wrap gap-1">
                {member.expertise.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="default" size="sm">
                    {skill}
                  </Badge>
                ))}
                {member.expertise.length > 3 && (
                  <Badge variant="default" size="sm">
                    +{member.expertise.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Social Links */}
          {(member.email || member.linkedin_url || member.twitter_url) && (
            <div className="flex gap-2 py-2 border-t border-gray-100">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Send Email"
                >
                  <Mail className="h-4 w-4 text-gray-600" />
                </a>
              )}
              {member.linkedin_url && (
                <a
                  href={member.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="LinkedIn"
                >
                  <Linkedin className="h-4 w-4 text-gray-600" />
                </a>
              )}
              {member.twitter_url && (
                <a
                  href={member.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Twitter"
                >
                  <Twitter className="h-4 w-4 text-gray-600" />
                </a>
              )}
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <Badge variant={member.is_active ? 'success' : 'warning'} size="sm">
              {member.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              icon={Edit2}
              onClick={onEdit}
              fullWidth
            >
              Edit
            </Button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default TeamCard;