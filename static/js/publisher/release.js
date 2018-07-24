import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';

import RevisionsList from './release/revisionsList';
import RevisionsTable from './release/revisionsTable';


const initReleases = (id, data) => {
  ReactDOM.render(
    <Fragment>
      <RevisionsTable revisions={data} />
      <RevisionsList revisions={data} />
    </Fragment>,
    document.querySelector(id)
  );
};

export {
  initReleases
};
