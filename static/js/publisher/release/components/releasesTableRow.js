import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import { getArchitectures, getPendingChannelMap } from "../selectors";
import ReleasesTableCell from "./releasesTableCell";

import { promoteChannel } from "../actions/pendingReleases";
import { closeChannel } from "../actions/pendingCloses";

import {
  RISKS_WITH_AVAILABLE as RISKS,
  AVAILABLE,
  STABLE,
  BETA,
  EDGE
} from "../constants";

import { getChannelName, isInDevmode } from "../helpers";
import PromoteMenu from "./promoteMenu";
import AvailableRevisionsMenu from "./availableRevisionsMenu";

const disabledBecauseDevmode = (
  <Fragment>
    Revisions with devmode confinement or devel grade <br />
    cannot be released to stable or candidate channels.
  </Fragment>
);

const disabledBecauseReleased = "The same revisions are already promoted.";

const disabledBecauseNotSelected = "Select some revisions to promote them.";

class ReleasesTableRow extends Component {
  renderRevisionCell(track, risk, arch, showVersion) {
    return (
      <ReleasesTableCell
        key={`${track}/${risk}/${arch}`}
        track={track}
        risk={risk}
        arch={arch}
        showVersion={showVersion}
      />
    );
  }

  onPromoteToChannel(channel, targetChannel) {
    this.props.promoteChannel(channel, targetChannel);
  }

  onCloseChannel(channel) {
    this.props.closeChannel(channel);
  }

  compareChannels(channel, targetChannel) {
    const channelMap = this.props.pendingChannelMap;

    const channelArchs = channelMap[channel];
    const targetChannelArchs = channelMap[targetChannel];

    if (channelArchs) {
      return Object.keys(channelArchs).every(arch => {
        return (
          targetChannelArchs &&
          targetChannelArchs[arch] &&
          channelArchs[arch].revision === targetChannelArchs[arch].revision
        );
      });
    }

    return channelArchs === targetChannelArchs;
  }

  renderChannelRow(risk) {
    const track = this.props.currentTrack;
    const archs = this.props.archs;
    const pendingChannelMap = this.props.pendingChannelMap;

    const channel = getChannelName(track, risk);

    let canBePromoted = true;
    let canBeClosed = true;
    let promoteTooltip;

    if (risk === STABLE) {
      canBePromoted = false;
    }

    if (risk === AVAILABLE) {
      canBeClosed = false;
    }

    if (
      !pendingChannelMap[channel] ||
      this.props.pendingCloses.includes(channel)
    ) {
      canBePromoted = false;
      canBeClosed = false;
    }

    if (
      channel === AVAILABLE &&
      (!pendingChannelMap[channel] ||
        Object.keys(pendingChannelMap[channel]).length === 0)
    ) {
      promoteTooltip = disabledBecauseNotSelected;
    }

    let targetChannels = [];

    if (canBePromoted) {
      // take all risks above current one
      targetChannels = RISKS.slice(0, RISKS.indexOf(risk)).map(risk => {
        return { channel: getChannelName(track, risk) };
      });

      // check for devmode revisions
      if (risk === EDGE || risk === BETA || risk === AVAILABLE) {
        const hasDevmodeRevisions = Object.values(
          pendingChannelMap[channel]
        ).some(isInDevmode);

        // remove stable and beta channels as targets if any revision
        // is in devmode
        if (hasDevmodeRevisions) {
          targetChannels[0].isDisabled = true;
          targetChannels[0].reason = disabledBecauseDevmode;
          targetChannels[1].isDisabled = true;
          targetChannels[1].reason = disabledBecauseDevmode;
        }
      }

      // filter out channels that have the same revisions already released
      targetChannels.forEach(targetChannel => {
        if (this.compareChannels(channel, targetChannel.channel)) {
          targetChannel.isDisabled = true;
          targetChannel.reason = disabledBecauseReleased;
        }
      });

      if (targetChannels.length === 0) {
        canBePromoted = false;
      }
    }

    const filteredChannel =
      this.props.filters &&
      getChannelName(this.props.filters.track, this.props.filters.risk);

    let hasSameVersion = false;
    let channelVersion = "";
    let versionsMap = {};
    if (pendingChannelMap[channel]) {
      // calculate map of architectures for each version
      for (const arch in pendingChannelMap[channel]) {
        const version = pendingChannelMap[channel][arch].version;
        if (!versionsMap[version]) {
          versionsMap[version] = [];
        }
        versionsMap[version].push(arch);
      }

      hasSameVersion = Object.keys(versionsMap).length === 1;
      if (hasSameVersion) {
        channelVersion = Object.values(pendingChannelMap[channel])[0].version;
      } else {
        channelVersion = "Multiple versions";
      }
    }

    const channelVersionTooltip = (
      <Fragment>
        {Object.keys(versionsMap).map(version => {
          return (
            <span key={`tooltip-${channel}-${version}`}>
              {version}:{" "}
              <b>
                {versionsMap[version].length === archs.length
                  ? "All architectures"
                  : versionsMap[version].join(", ")}
              </b>
              <br />
            </span>
          );
        })}
      </Fragment>
    );

    const rowTitle = risk === AVAILABLE ? channelVersion : channel;

    return (
      <Fragment>
        {risk === AVAILABLE && (
          <h4>
            Revisions available to release from &nbsp;
            <form className="p-form p-form--inline">
              <AvailableRevisionsMenu />
            </form>
          </h4>
        )}
        <div
          className={`p-releases-table__row p-releases-table__row--channel p-releases-table__row--${risk}`}
        >
          <div
            className={`p-releases-channel ${
              filteredChannel === channel ? "is-active" : ""
            }`}
          >
            <span className="p-releases-channel__name p-release-data__info p-tooltip p-tooltip--btm-center">
              <span className="p-release-data__title">{rowTitle}</span>
              {risk !== AVAILABLE && (
                <span className="p-release-data__meta">{channelVersion}</span>
              )}
              {channelVersion && (
                <span className="p-tooltip__message">
                  {channelVersionTooltip}
                </span>
              )}
            </span>

            <span className="p-releases-table__menus">
              {canBePromoted && (
                <PromoteMenu
                  tooltip={promoteTooltip}
                  targetChannels={targetChannels}
                  promoteToChannel={this.onPromoteToChannel.bind(this, channel)}
                />
              )}
              {canBeClosed && (
                <button
                  className="p-button--base p-icon-button u-no-margin"
                  onClick={this.onCloseChannel.bind(this, channel)}
                  title={`Close channel ${channel}`}
                >
                  <i className="p-icon--delete" />
                </button>
              )}
            </span>
          </div>
          {archs.map(arch =>
            this.renderRevisionCell(track, risk, arch, !hasSameVersion)
          )}
        </div>
      </Fragment>
    );
  }

  render() {
    return this.renderChannelRow(this.props.risk);
  }
}

ReleasesTableRow.propTypes = {
  // props
  risk: PropTypes.string.isRequired,

  // state
  currentTrack: PropTypes.string.isRequired,
  filters: PropTypes.object,
  pendingCloses: PropTypes.array.isRequired,

  archs: PropTypes.array.isRequired,
  pendingChannelMap: PropTypes.object,

  // actions
  closeChannel: PropTypes.func.isRequired,
  promoteChannel: PropTypes.func.isRequired
};

const mapStateToProps = state => {
  return {
    currentTrack: state.currentTrack,
    filters: state.history.filters,
    pendingCloses: state.pendingCloses,
    archs: getArchitectures(state),
    pendingChannelMap: getPendingChannelMap(state)
  };
};

const mapDispatchToProps = dispatch => {
  return {
    promoteChannel: (channel, targetChannel) =>
      dispatch(promoteChannel(channel, targetChannel)),
    closeChannel: channel => dispatch(closeChannel(channel))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ReleasesTableRow);