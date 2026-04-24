import { motion } from 'framer-motion';
import { Edit2, Trash2, Eye, Mail, Badge as BadgeIcon } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';

const TeamList = ({ members, onEdit, onDelete, onView }) => {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Department</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Contact</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <motion.tr
                key={member.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {member.image_url ? (
                      <img
                        src={member.image_url}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center text-sm font-bold text-primary-700">
                        {member.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.years_experience} years exp</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-700">{member.role}</td>
                <td className="py-3 px-4">
                  <Badge variant="info">{member.department}</Badge>
                </td>
                <td className="py-3 px-4">
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
                    >
                      <Mail className="h-4 w-4" />
                      Contact
                    </a>
                  )}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={member.is_active ? 'success' : 'warning'}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(member.id)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onEdit(member.id)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onDelete(member.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TeamList;