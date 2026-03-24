export const GalaxyTrackedLink = ({ href, eventName, children, ...rest }) => {
  const handleClick = () => {
    if (window.galaxy) {
      window.galaxy.track(eventName, { interaction: 'click' });
    }
  };

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
};
