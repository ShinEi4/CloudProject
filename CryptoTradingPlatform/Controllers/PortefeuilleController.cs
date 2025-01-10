// PortefeuilleController
using Microsoft.AspNetCore.Mvc;
using CryptoTradingPlatform.Views;

namespace CryptoTradingPlatform.Controllers;


public class PortefeuilleController : Controller
{
    private readonly ApplicationDbContext _context;

    public PortefeuilleController(ApplicationDbContext context)
    {
        _context = context;
    }

    public IActionResult Index()
    {
        var portefeuilles = _context.Portefeuilles.ToList();
        return View(portefeuilles);
    }

    public IActionResult Details(int id)
    {
        var portefeuille = _context.Portefeuilles.Find(id);
        if (portefeuille == null)
        {
            return NotFound();
        }
        return View(portefeuille);
    }

    public IActionResult Transactions()
    {
        var transactions = _context.Transactions.ToList();
        return View(transactions);
    }
}
