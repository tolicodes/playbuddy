import React from "react";
import { CommunitiesList } from "./CommunitiesList";
import { JoinCommunity } from "./JoinCommunity";

export const MyCommunitiesSection: React.FC = () => {
    return <>
        <JoinCommunity />
        <CommunitiesList />
    </>
}