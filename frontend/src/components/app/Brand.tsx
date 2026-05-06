import { Link } from "react-router-dom";
import logo from "../../assets/networks-logo.png";

export function Brand({ to = "/", showCompany = false }: { to?: string; showCompany?: boolean }) {
  return (
    <Link to={to} className="brand-link">
      <img src={logo} alt="NetWorks logo" className="brand-logo" />
      <span className="brand-copy">
        {showCompany ? <small>NetWorks</small> : null}
        <strong>SubnetOps</strong>
      </span>
    </Link>
  );
}
