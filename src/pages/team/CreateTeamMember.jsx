import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import Button from '@/components/common/Button';
import TeamForm from '@/components/team/TeamForm';

const CreateTeamMember = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Team', path: '/team' },
        { label: 'Add Member', path: '/team/create' },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Add Team Member</h1>
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => navigate('/team')}
        >
          Back
        </Button>
      </div>

      <TeamForm onSuccess={() => navigate('/team')} />
    </div>
  );
};

export default CreateTeamMember;