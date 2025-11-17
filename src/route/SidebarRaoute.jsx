import { lazy } from "react";
import {
  FaUsers,
} from "react-icons/fa";

const SurveyResponses = lazy(() => import("../pages/SurveyResponses"));

const routes = [
  {
    path: "/survey-responses",
    component: SurveyResponses,
    name: "Survey Responses",
    icon: FaUsers, 
  },
];

export default routes;
