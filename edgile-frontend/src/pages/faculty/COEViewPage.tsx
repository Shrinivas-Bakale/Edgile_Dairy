import React from 'react';
import { useParams } from 'react-router-dom';
import COEViewPage from '../admin/COEViewPage';

const FacultyCOEViewPage: React.FC = () => {
  const { id } = useParams();
  // Pass the id prop to the admin COEViewPage
  return <COEViewPage id={id} />;
};

export default FacultyCOEViewPage; 