export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Marketing header will go here */}
      <main>{children}</main>
      {/* Marketing footer will go here */}
    </div>
  );
}
