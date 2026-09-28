import LiftForm from './LiftForm';

export default function Home() {
  return (
    <main className="page">
      <h1>Lift specifications</h1>
      <p className="lead">
        Add one lift at a time. After you save, the form clears so you can add the next one.
        Every lift added so far is listed <a href="#all-lifts">below the form</a>, where you can edit it.
      </p>
      <LiftForm />
    </main>
  );
}
