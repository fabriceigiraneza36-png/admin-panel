import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTeam } from '@/hooks/useTeam';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';

const TeamPage = () => {
  const navigate = useNavigate();
  const { teamMembers, isLoading } = useTeam();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Breadcrumb items={[{ label: 'Team', path: '/team' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-500 mt-1">Manage your team and staff</p>
        </div>
        <Button
          icon={Plus}
          onClick={() => navigate('/team/create')}
        >
          Add Member
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner fullScreen />
      ) : teamMembers.length === 0 ? (
        <EmptyState
          title="No team members"
          description="Add your first team member"
          action={() => navigate('/team/create')}
          actionLabel="Add Member"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {member.image_url && (
                <img
                  src={member.image_url}
                  alt={member.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-gray-500">{member.role}</p>
                <p className="text-xs text-gray-400 mt-1">{member.department}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TeamPage;