using Microsoft.AspNetCore.Mvc;
using CryptoTradingPlatform.Views;

namespace CryptoTradingPlatform.Controllers;

// UtilisateurController
public class UtilisateurController : Controller
{
    private readonly ApplicationDbContext _context;

    public UtilisateurController(ApplicationDbContext context)
    {
        _context = context;
    }

    public IActionResult Inscription()
    {
        return View();
    }

    [HttpPost]
    public IActionResult Inscription(Utilisateur utilisateur)
    {
        if (ModelState.IsValid)
        {
            utilisateur.Is_Valid = false;
            _context.Utilisateurs.Add(utilisateur);
            _context.SaveChanges();
            return RedirectToAction("Connexion");
        }
        return View(utilisateur);
    }

    public IActionResult Connexion()
    {
        return View();
    }

    [HttpPost]
    public IActionResult Connexion(string email, string mdp)
    {
        var utilisateur = _context.Utilisateurs
            .FirstOrDefault(u => u.Email == email && u.Mdp == mdp && u.Is_Valid);
        if (utilisateur != null)
        {
            return RedirectToAction("Index", "Portefeuille");
        }
        ModelState.AddModelError("", "Email ou mot de passe incorrect");
        return View();
    }
}